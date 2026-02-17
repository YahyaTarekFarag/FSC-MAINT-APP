import { useState, useEffect } from 'react';
import {
    BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    TrendingUp, TrendingDown, Activity, AlertTriangle,
    DollarSign, Clock, Package, PieChart as PieIcon, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

interface DashboardStats {
    total_spend: number;
    avg_efficiency_days: number;
    critical_faults: number;
    inventory_alerts: number;
    fault_distribution: { name: string; value: number }[];
    spending_trend: { name: string; repairs: number; month_date: string }[];
}

const DashboardAnalytics = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            setError(null);

            // Try RPC first (preferred — server-side aggregation)
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_stats');

            if (!rpcError && rpcData) {
                setStats(rpcData as DashboardStats);
                setLoading(false);
                return;
            }

            // Fallback: client-side aggregation if RPC not deployed yet
            console.warn('RPC not available, using client-side fallback:', rpcError?.message);

            interface FallbackTicket {
                fault_category: string;
                repair_cost: number | null;
                created_at: string;
                closed_at: string | null;
                status: string;
                category_id: string | null;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [ticketsRes, , urgentRes, lowStockRes] = await Promise.all([
                (supabase.from('tickets') as any)
                    .select('fault_category, repair_cost, created_at, closed_at, status, category_id'),
                supabase
                    .from('spare_parts')
                    .select('quantity, minimum_stock'),
                supabase
                    .from('tickets')
                    .select('*', { count: 'exact', head: true })
                    .eq('priority', 'urgent')
                    .neq('status', 'closed'),
                supabase
                    .from('spare_parts')
                    .select('*', { count: 'exact', head: true })
                    .lt('quantity', 10),
            ]);

            const tickets: FallbackTicket[] = ticketsRes.data || [];

            // Total Spend
            const totalSpend = tickets.reduce((sum: number, t: FallbackTicket) => sum + (t.repair_cost || 0), 0);

            // Average Efficiency
            const closedTickets = tickets.filter((t: FallbackTicket) => t.status === 'closed' && t.closed_at);
            const avgDays = closedTickets.length > 0
                ? closedTickets.reduce((sum: number, t: FallbackTicket) => {
                    const diff = new Date(t.closed_at!).getTime() - new Date(t.created_at).getTime();
                    return sum + diff / (1000 * 60 * 60 * 24);
                }, 0) / closedTickets.length
                : 0;

            // Fault Distribution
            const catMap = new Map<string, number>();
            tickets.forEach((t: FallbackTicket) => {
                const cat = t.fault_category || 'غير مصنف';
                catMap.set(cat, (catMap.get(cat) || 0) + 1);
            });
            const faultDist = Array.from(catMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 8);

            // Monthly Spending
            const monthMap = new Map<string, number>();
            closedTickets.forEach((t: FallbackTicket) => {
                const month = new Date(t.closed_at!).toLocaleDateString('ar-EG', { month: 'long' });
                monthMap.set(month, (monthMap.get(month) || 0) + (t.repair_cost || 0));
            });
            const spendingTrend = Array.from(monthMap.entries())
                .map(([name, repairs]) => ({ name, repairs, month_date: name }));


            setStats({
                total_spend: totalSpend,
                avg_efficiency_days: Math.round(avgDays * 10) / 10,
                critical_faults: urgentRes.count || 0,
                inventory_alerts: lowStockRes.count || 0,
                fault_distribution: faultDist,
                spending_trend: spendingTrend,
            });
        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('فشل في تحميل بيانات التحليلات');
        } finally {
            setLoading(false);
        }
    };

    const KPICard = ({ title, value, icon: Icon, trend, color }: {
        title: string;
        value: string | number;
        icon: React.ElementType;
        trend?: number;
        color: string;
    }) => (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-opacity-10 ${color}`}>
                    <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
                </div>
                {trend !== undefined && trend !== 0 && (
                    <div className={`flex items-center text-sm font-bold ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trend > 0 ? <TrendingUp className="w-4 h-4 ml-1" /> : <TrendingDown className="w-4 h-4 ml-1" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <h3 className="text-slate-500 text-sm font-bold mb-1">{title}</h3>
            <div className="text-2xl font-black text-slate-900">{value}</div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 text-sm font-bold">جاري تحميل التحليلات...</p>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center text-red-500">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
                    <p className="font-bold">{error || 'حدث خطأ غير متوقع'}</p>
                    <button onClick={fetchDashboardStats} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-500">
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-8 font-sans" dir="rtl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">لوحة التحليلات التنفيذية</h1>
                <p className="text-slate-500 text-sm">بيانات حية من قاعدة البيانات — آخر تحديث: الآن</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard
                    title="إجمالي الإنفاق (سنوي)"
                    value={`${stats.total_spend.toLocaleString()} ج.م`}
                    icon={DollarSign}
                    color="text-blue-600 bg-blue-600"
                />
                <KPICard
                    title="كفاءة الإغلاق (متوسط)"
                    value={`${stats.avg_efficiency_days} يوم`}
                    icon={Clock}
                    color="text-purple-600 bg-purple-600"
                />
                <KPICard
                    title="أعطال حرجة (مفتوحة)"
                    value={stats.critical_faults}
                    icon={AlertTriangle}
                    color="text-red-600 bg-red-600"
                />
                <KPICard
                    title="تنبيهات المخزون"
                    value={stats.inventory_alerts}
                    icon={Package}
                    color="text-orange-600 bg-orange-600"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Spending Trend */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-500" />
                            اتجاه تكلفة الإصلاحات الشهرية
                        </h3>
                    </div>
                    {stats.spending_trend.length > 0 ? (
                        <div className="h-80 w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.spending_trend}>
                                    <defs>
                                        <linearGradient id="colorRepairs" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ج.م`, 'تكلفة الإصلاحات']} />
                                    <Area type="monotone" dataKey="repairs" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRepairs)" name="إصلاحات" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                            لا توجد بيانات إصلاحات مغلقة بعد
                        </div>
                    )}
                </div>

                {/* Fault Distribution */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <PieIcon className="w-5 h-5 text-purple-500" />
                            توزيع الأعطال حسب الفئة
                        </h3>
                    </div>
                    {stats.fault_distribution.length > 0 ? (
                        <div className="h-80 w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.fault_distribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                    >
                                        {stats.fault_distribution.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                            لا توجد بيانات أعطال بعد
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Table */}
            {stats.fault_distribution.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                        <BarChart className="w-5 h-5 text-emerald-500" />
                        ملخص الأعطال
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-right py-3 px-4 font-bold text-slate-600">الفئة</th>
                                    <th className="text-right py-3 px-4 font-bold text-slate-600">عدد التذاكر</th>
                                    <th className="text-right py-3 px-4 font-bold text-slate-600">النسبة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.fault_distribution.map((item, i) => {
                                    const total = stats.fault_distribution.reduce((s, f) => s + f.value, 0);
                                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                                    return (
                                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                                            <td className="py-3 px-4 flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                {item.name}
                                            </td>
                                            <td className="py-3 px-4 font-bold">{item.value}</td>
                                            <td className="py-3 px-4 text-slate-500">{pct}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardAnalytics;
