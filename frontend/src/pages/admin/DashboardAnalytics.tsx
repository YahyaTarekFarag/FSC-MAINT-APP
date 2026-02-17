import { useState, useEffect } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    TrendingUp, Activity, AlertTriangle,
    DollarSign, Clock, PieChart as PieIcon, Loader2, Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

interface DashboardStats {
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    completed_tickets: number;
    avg_repair_time: number;
    total_cost: number;
    top_faults: { fault_type: string; c: number }[];
    // Mapped for charts
    fault_distribution: { name: string; value: number }[];
    spending_trend: { name: string; repairs: number; month_date: string }[];
}

type TechnicianPerformance = {
    technician_id: string;
    full_name: string;
    completed_tickets: number;
    avg_repair_time: number;
    total_cost: number;
};

interface RawDashboardStats {
    total_tickets: number;
    open_tickets: number;
    in_progress_tickets: number;
    completed_tickets: number;
    avg_repair_time: number;
    total_cost: number;
    top_faults: { fault_type: string; c: number }[];
}

const DashboardAnalytics = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [techPerformance, setTechPerformance] = useState<TechnicianPerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState('30_days');

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const endDate = new Date();
            const startDate = new Date();
            if (period === '7_days') startDate.setDate(endDate.getDate() - 7);
            if (period === '30_days') startDate.setDate(endDate.getDate() - 30);
            if (period === '90_days') startDate.setDate(endDate.getDate() - 90);

            // 1. Fetch Dashboard Stats (RPC)
            type StatsCall = (name: 'get_dashboard_stats', args: { current_user_id: string; period_start: string; period_end: string }) => Promise<{ data: RawDashboardStats | null; error: unknown }>;
            const { data: rpcData, error: rpcError } = await (supabase.rpc as unknown as StatsCall)('get_dashboard_stats', {
                current_user_id: user.id,
                period_start: startDate.toISOString(),
                period_end: endDate.toISOString()
            });

            if (rpcError) throw rpcError;
            const rawStats = rpcData as RawDashboardStats;

            const faultDist = (rawStats.top_faults || []).map((f: { fault_type: string; c: number }) => ({
                name: f.fault_type,
                value: f.c
            }));

            // 2. Fetch Spending Trend (New RPC)
            type TrendCall = (name: 'get_spending_trend', args: { current_user_id: string; period_start: string; period_end: string }) => Promise<{ data: Array<{ name: string; repairs: number }> | null; error: unknown }>;
            const { data: trendData, error: trendError } = await (supabase.rpc as unknown as TrendCall)('get_spending_trend', {
                current_user_id: user.id,
                period_start: startDate.toISOString(),
                period_end: endDate.toISOString()
            });

            if (trendError) console.error('Error fetching trend:', trendError);
            const spendingTrend = (trendData as Array<{ name: string; repairs: number }> || []).map(t => ({
                name: t.name,
                repairs: Number(t.repairs || 0),
                month_date: t.name
            }));

            setStats({
                total_tickets: rawStats.total_tickets,
                open_tickets: rawStats.open_tickets,
                in_progress_tickets: rawStats.in_progress_tickets,
                completed_tickets: rawStats.completed_tickets,
                avg_repair_time: rawStats.avg_repair_time,
                total_cost: rawStats.total_cost,
                top_faults: rawStats.top_faults,
                fault_distribution: faultDist,
                spending_trend: spendingTrend
            });

            // 3. Fetch Technician Performance (RPC)
            type TechCall = (name: 'get_technician_performance', args: { period_start: string; period_end: string }) => Promise<{ data: TechnicianPerformance[] | null; error: unknown }>;
            const { data: techData, error: techError } = await (supabase.rpc as unknown as TechCall)('get_technician_performance', {
                period_start: startDate.toISOString(),
                period_end: endDate.toISOString()
            });

            if (techError) throw techError;
            setTechPerformance(techData as TechnicianPerformance[] || []);

        } catch (err) {
            console.error('Error fetching analytics:', err);
            setError('فشل في تحميل بيانات التحليلات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period]);

    const KPICard = ({ title, value, icon: Icon, color, subValue }: {
        title: string;
        value: string | number;
        icon: React.ElementType;
        color: string;
        subValue?: string;
    }) => (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-opacity-10 ${color}`}>
                    <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
                </div>
            </div>
            <h3 className="text-slate-500 text-sm font-bold mb-1">{title}</h3>
            <div className="text-2xl font-black text-slate-900">{value}</div>
            {subValue && <div className="text-xs text-slate-400 mt-1">{subValue}</div>}
        </div>
    );

    if (loading && !stats) {
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
                    <button onClick={fetchAnalytics} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-blue-500">
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-8 font-sans" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">لوحة التحليلات التنفيذية</h1>
                    <p className="text-slate-500 text-sm">نظرة شاملة على أداء الصيانة والفنيين</p>
                </div>

                <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="7_days">آخر 7 أيام</option>
                    <option value="30_days">آخر 30 يوم</option>
                    <option value="90_days">آخر 3 شهور</option>
                </select>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard
                    title="إجمالي التذاكر"
                    value={stats.total_tickets}
                    subValue={`${stats.completed_tickets} مغلقة | ${stats.in_progress_tickets} جارية`}
                    icon={Activity}
                    color="text-blue-600 bg-blue-600"
                />
                <KPICard
                    title="متوسط وقت الإصلاح"
                    value={`${stats.avg_repair_time || 0} دقيقة`}
                    icon={Clock}
                    color="text-purple-600 bg-purple-600"
                />
                <KPICard
                    title="إجمالي التكلفة"
                    value={`${stats.total_cost.toLocaleString()} ج.م`}
                    icon={DollarSign}
                    color="text-green-600 bg-green-600"
                />
                <KPICard
                    title="تذاكر مفتوحة"
                    value={stats.open_tickets}
                    icon={AlertTriangle}
                    color="text-red-600 bg-red-600"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Spending Trend */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            اتجاه التكاليف
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
                                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value) => [`${Number(value).toLocaleString()} ج.م`, 'التكلفة']}
                                    />
                                    <Area type="monotone" dataKey="repairs" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRepairs)" name="التكلفة" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                            لا توجد بيانات تكاليف للفترة المحددة
                        </div>
                    )}
                </div>

                {/* Fault Distribution */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <PieIcon className="w-5 h-5 text-purple-500" />
                            توزيع الأعطال
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
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                            لا توجد بيانات أعطال للفترة المحددة
                        </div>
                    )}
                </div>
            </div>

            {/* Technician Leaderboard & Top Faults */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Technician Leaderboard */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50">
                        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            آداء الفنيين
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4 font-medium">الفني</th>
                                    <th className="px-6 py-4 font-medium">المنجز</th>
                                    <th className="px-6 py-4 font-medium">متوسط الوقت</th>
                                    <th className="px-6 py-4 font-medium">مؤشر الأداء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {techPerformance.map((tech) => (
                                    <tr key={tech.technician_id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700">{tech.full_name}</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-xs font-bold">
                                                {tech.completed_tickets} تذكرة
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-mono text-xs">{tech.avg_repair_time || '-'} دقيقة</td>
                                        <td className="px-6 py-4">
                                            <div className="w-full bg-slate-100 rounded-full h-2 max-w-[120px]">
                                                <div
                                                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(100, (tech.completed_tickets / 10) * 100)}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {techPerformance.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                            لا توجد بيانات للأداء في هذه الفترة
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top Faults List */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        الأعطال الأكثر تكراراً
                    </h3>
                    <div className="space-y-4">
                        {stats.top_faults.map((fault, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-medium text-slate-700">{fault.fault_type}</span>
                                    <span className="text-slate-500 font-mono bg-slate-100 px-2 rounded">{fault.c}</span>
                                </div>
                                <div className="w-full bg-slate-50 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : 'bg-amber-400'}`}
                                        style={{ width: `${(fault.c / (stats.total_tickets || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {stats.top_faults.length === 0 && (
                            <div className="text-center text-slate-400 py-8 text-sm">
                                لا توجد بيانات أعطال
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardAnalytics;
