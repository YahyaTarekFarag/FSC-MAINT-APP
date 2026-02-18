import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Download, Filter, TrendingUp, DollarSign, Clock, Users, Loader2, Package, AlertTriangle
} from 'lucide-react';
import { exportToExcel, formatTicketsForExport } from '../../../utils/exportUtils';
import { formatCurrency } from '../../../utils/helpers';

// Interfaces for better type safety
interface Branch {
    id: string;
    name_ar: string;
}

interface Technician {
    id: string;
    full_name: string;
}

interface Ticket {
    id: string;
    title: string;
    description: string;
    status: 'open' | 'in_progress' | 'closed' | 'resolved';
    priority: string;
    branch_id: string;
    technician_id: string | null;
    created_at: string;
    repair_cost: number;
    branches?: { name_ar: string };
    profiles?: { full_name: string };
    branch_name?: string;
    technician_name?: string;
}

interface BranchPerformance {
    branch_id: string;
    branch_name: string;
    total_tickets: number;
    closed_tickets: number;
    total_maintenance_cost: number;
    avg_downtime_hours: number;
    monthly_trend: { month: string, count: number, cost: number }[];
    avg_asset_health_score: number;
}

interface InventoryStats {
    totalValue: number;
    totalItems: number;
    lowStockItems: number;
    topConsumed: { name: string, quantity: number }[];
}

// Helper types for Supabase responses
type SparePartResponse = {
    quantity: number;
    price: number;
    min_threshold: number;
    name_ar: string;
};

type TransactionResponse = {
    part_id: number;
    change_amount: number;
    transaction_type: string;
    spare_parts: { name_ar: string } | null;
};

const ReportsPage = () => {
    const [viewMode, setViewMode] = useState<'tickets' | 'branches' | 'inventory'>('tickets');
    const [branchStats, setBranchStats] = useState<BranchPerformance[]>([]);
    const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [technicians, setTechnicians] = useState<Technician[]>([]);

    // Filters
    const [dateRange, setDateRange] = useState('month');
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [selectedTech, setSelectedTech] = useState('all');

    useEffect(() => {
        if (viewMode === 'tickets') {
            fetchData();
        } else if (viewMode === 'branches') {
            fetchBranchStats();
        } else {
            fetchInventoryStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange, selectedBranch, selectedTech, viewMode]);

    const fetchInventoryStats = async () => {
        setLoading(true);
        try {
            // 1. Fetch Parts for Value & Low Stock
            const { data: parts, error: partsError } = await supabase
                .from('spare_parts')
                .select('quantity, price, min_threshold, name_ar')
                .returns<SparePartResponse[]>();

            if (partsError) throw partsError;

            const totalValue = parts?.reduce((acc, p) => acc + (p.quantity * p.price), 0) || 0;
            const totalItems = parts?.reduce((acc, p) => acc + p.quantity, 0) || 0;
            const lowStockItems = parts?.filter(p => p.quantity <= p.min_threshold).length || 0;

            // 2. Fetch Transactions for Consumption (Top 5)
            const { data: transactions, error: transError } = await supabase
                .from('inventory_transactions')
                .select('part_id, change_amount, transaction_type, spare_parts(name_ar)')
                .eq('transaction_type', 'usage') // Assuming 'usage' is the type for consumption
                .limit(500)
                .returns<TransactionResponse[]>();

            if (transError) throw transError;

            const consumptionMap: Record<string, number> = {};
            transactions?.forEach(t => {
                // Safely access nested property
                const name = t.spare_parts?.name_ar || 'Unknown';
                const amount = Math.abs(t.change_amount);
                consumptionMap[name] = (consumptionMap[name] || 0) + amount;
            });

            const topConsumed = Object.entries(consumptionMap)
                .map(([name, quantity]) => ({ name, quantity }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);

            setInventoryStats({
                totalValue,
                totalItems,
                lowStockItems,
                topConsumed
            });

        } catch (err) {
            console.error('Error fetching inventory stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBranchStats = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('v_branch_performance').select('*');
            if (error) throw error;
            setBranchStats(data || []);
        } catch (err) {
            console.error('Error fetching branch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Base Queries
            let query = supabase
                .from('tickets')
                .select(`
                    *,
                    branches (name_ar),
                    profiles:technician_id (full_name)
                `)
                .order('created_at', { ascending: false });

            // Apply Filters
            if (dateRange !== 'all') {
                const now = new Date();
                const startDate = new Date();
                if (dateRange === 'week') startDate.setDate(now.getDate() - 7);
                if (dateRange === 'month') startDate.setMonth(now.getMonth() - 1);
                if (dateRange === 'year') startDate.setFullYear(now.getFullYear() - 1);
                query = query.gte('created_at', startDate.toISOString());
            }

            if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch);
            if (selectedTech !== 'all') query = query.eq('technician_id', selectedTech);

            const { data, error } = await query;
            if (error) throw error;

            // Fetch metadata for Dropdowns
            if (branches.length === 0) {
                const branchesRes = await supabase.from('branches').select('id, name_ar');
                if (branchesRes.data) {
                    setBranches(branchesRes.data as Branch[]);
                }

                const techRes = await supabase.from('profiles').select('id, full_name').eq('role', 'technician');
                if (techRes.data) {
                    setTechnicians(techRes.data as Technician[]);
                }
            }

            // Process Data
            const processedData = (data || []).map((t: Ticket) => ({
                ...t,
                branch_name: t.branches?.name_ar,
                technician_name: t.profiles?.full_name
            })) || [];

            setTickets(processedData);

        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        // Generic export based on view mode
        if (viewMode === 'inventory' && inventoryStats) {
            const exportData = inventoryStats.topConsumed.map(item => ({
                'اسم القطعة': item.name,
                'والكمية المستهلكة': item.quantity
            }));
            // Also add general stats as a separate sheet or rows if needed, but for now just the list
            exportToExcel(exportData, `Inventory_Usage_Report_${new Date().toISOString().split('T')[0]}`);
            return;
        }

        if (viewMode === 'branches') {
            const exportData = branchStats.map(b => ({
                'الفرع': b.branch_name,
                'البلاغات': b.total_tickets,
                'التكلفة': b.total_maintenance_cost,
                'معدل التوقف (ساعة)': b.avg_downtime_hours,
                'صحة الأصول %': b.avg_asset_health_score
            }));
            exportToExcel(exportData, `Branch_Performance_Report_${new Date().toISOString().split('T')[0]}`);
            return;
        }

        // Default: Tickets
        const exportData = tickets.map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            branch_name: t.branch_name,
            technician_name: t.technician_name,
            repair_cost: t.repair_cost,
            created_at: t.created_at,
            description: t.description
        }));
        const formatted = formatTicketsForExport(exportData);
        exportToExcel(formatted, `Maintenance_Report_${new Date().toISOString().split('T')[0]}`);
    };

    // Calculate KPIs
    const totalCost = tickets.reduce((acc, t) => acc + (t.repair_cost || 0), 0);
    const completedTickets = tickets.filter(t => t.status === 'closed' || t.status === 'resolved');
    const avgCost = completedTickets.length ? totalCost / completedTickets.length : 0;

    // Chart Data Preparation: Technician Performance
    const techPerformance = tickets.reduce((acc: { [key: string]: { name: string, count: number, cost: number } }, t) => {
        const techName = t.technician_name || 'Unassigned';
        if (!acc[techName]) acc[techName] = { name: techName, count: 0, cost: 0 };
        acc[techName].count += 1;
        acc[techName].cost += (t.repair_cost || 0);
        return acc;
    }, {});
    const chartData = Object.values(techPerformance);

    if (loading && tickets.length === 0 && !inventoryStats && branchStats.length === 0) return (
        <div className="flex justify-center items-center h-screen bg-slate-50">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-8 font-sans" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">التقارير والتحليلات</h1>
                    <p className="text-slate-500 text-sm">احصائيات شاملة عن أداء الصيانة والتكاليف والمخزون</p>
                </div>

                {/* View Toggles */}
                <div className="flex bg-slate-200 p-1 rounded-xl order-3 md:order-2">
                    <button
                        onClick={() => setViewMode('tickets')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'tickets' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        البلاغات
                    </button>
                    <button
                        onClick={() => setViewMode('branches')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'branches' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        أداء الفروع
                    </button>
                    <button
                        onClick={() => setViewMode('inventory')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'inventory' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        المخزون
                    </button>
                </div>

                <div className='order-2 md:order-3'>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                    >
                        <Download className="w-5 h-5" />
                        تصدير اكسل
                    </button>
                </div>
            </div>

            {/* Filters Bar - Only for Tickets */}
            {viewMode === 'tickets' && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-2 text-slate-500 font-bold ml-4">
                        <Filter className="w-5 h-5" />
                        <span>تصفية:</span>
                    </div>

                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 font-medium"
                    >
                        <option value="week">آخر أسبوع</option>
                        <option value="month">آخر شهر</option>
                        <option value="year">آخر سنة</option>
                        <option value="all">كل الوقت</option>
                    </select>

                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 font-medium"
                    >
                        <option value="all">جميع الفروع</option>
                        {branches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
                    </select>

                    <select
                        value={selectedTech}
                        onChange={(e) => setSelectedTech(e.target.value)}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 font-medium"
                    >
                        <option value="all">جميع الفنيين</option>
                        {technicians.map((t: Technician) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                    </select>
                </div>
            )}

            {viewMode === 'tickets' ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <TrendingUp className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm font-bold">إجمالي البلاغات</p>
                            <h3 className="text-3xl font-bold text-slate-900">{tickets.length}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-green-50 rounded-xl">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm font-bold">التكلفة الكلية</p>
                            <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(totalCost)}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-50 rounded-xl">
                                    <Users className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm font-bold">الفنيين النشطين</p>
                            <h3 className="text-3xl font-bold text-slate-900">{Object.keys(techPerformance).length}</h3>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-orange-50 rounded-xl">
                                    <Clock className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                            <p className="text-slate-500 text-sm font-bold">متوسط التكلفة/بلاغ</p>
                            <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(avgCost)}</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        {/* Chart Section */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                            <h3 className="font-bold text-lg text-slate-900 mb-6">أداء الفنيين (عدد البلاغات)</h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ fill: '#f1f5f9' }}
                                        />
                                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Branches or Costs */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg text-slate-900 mb-6">أعلى التكاليف حسب الفني</h3>
                            <div className="space-y-4">
                                {chartData.sort((a, b) => (b.cost || 0) - (a.cost || 0)).slice(0, 5).map((d, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="font-bold text-slate-700">{idx + 1}</div>
                                            <div className="font-medium text-slate-900">{d.name}</div>
                                        </div>
                                        <div className="font-bold text-slate-600">{formatCurrency(d.cost)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="font-bold text-lg text-slate-900">سجل البلاغات المفصل</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                                    <tr>
                                        <th className="p-4">رقم البلاغ</th>
                                        <th className="p-4">العنوان</th>
                                        <th className="p-4">الفرع</th>
                                        <th className="p-4">الفني</th>
                                        <th className="p-4">التاريخ</th>
                                        <th className="p-4">التكلفة</th>
                                        <th className="p-4">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tickets.slice(0, 10).map((t: Ticket) => (
                                        <tr key={t.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-mono text-slate-600">#{t.id}</td>
                                            <td className="p-4 font-medium text-slate-900">{t.title}</td>
                                            <td className="p-4">{t.branch_name || '-'}</td>
                                            <td className="p-4">{t.technician_name || '-'}</td>
                                            <td className="p-4 text-slate-500">{new Date(t.created_at).toLocaleDateString('ar-EG')}</td>
                                            <td className="p-4 font-bold">{formatCurrency(t.repair_cost)}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${t.status === 'closed' ? 'bg-green-100 text-green-700' :
                                                    t.status === 'open' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {tickets.length > 10 && (
                                <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 border-t border-slate-100">
                                    يتم عرض آخر 10 بلاغات فقط. قم بالتصدير لرؤية القائمة الكاملة.
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : viewMode === 'branches' ? (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {branchStats.map(stat => (
                            <div key={stat.branch_id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-xl text-slate-900">{stat.branch_name}</h3>
                                    <div className={`px-2 py-1 rounded text-xs font-black ${stat.avg_asset_health_score > 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {stat.avg_asset_health_score}% للصحة
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-500 font-medium">اجمالي التذاكر</span>
                                        <span className="font-bold text-slate-900">{stat.total_tickets}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-500 font-medium">معدل التوقف</span>
                                        <span className="font-bold text-slate-900">{stat.avg_downtime_hours} ساعة</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-2">
                                        <span className="text-slate-500 font-medium">التكلفة الإجمالية</span>
                                        <span className="font-bold text-slate-900">{formatCurrency(stat.total_maintenance_cost)}</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 mb-2">الأداء الشهري (آخر 12 شهر)</p>
                                    <div className="h-20 flex items-end gap-1">
                                        {stat.monthly_trend?.slice(0, 12).reverse().map((m, idx) => (
                                            <div key={idx} className="flex-1 bg-blue-100 rounded-t relative group" style={{ height: `${Math.min(100, (m.count / 20) * 100)}%` }}>
                                                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-1 rounded whitespace-nowrap z-10">
                                                    {m.month}: {m.count}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detailed Branch Table */}
                    {branchStats.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="font-bold text-lg text-slate-900">جدول أداء الفروع التفصيلي</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                                        <tr>
                                            <th className="p-4">الفرع</th>
                                            <th className="p-4">اجمالي البلاغات</th>
                                            <th className="p-4">البلاغات المغلقة</th>
                                            <th className="p-4">التكلفة</th>
                                            <th className="p-4">متوسط التوقف</th>
                                            <th className="p-4">صحة الأصول</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {branchStats.map((stat) => (
                                            <tr key={stat.branch_id} className="hover:bg-slate-50">
                                                <td className="p-4 font-bold text-slate-900">{stat.branch_name}</td>
                                                <td className="p-4">{stat.total_tickets}</td>
                                                <td className="p-4">{stat.closed_tickets}</td>
                                                <td className="p-4 font-bold text-slate-700">{formatCurrency(stat.total_maintenance_cost)}</td>
                                                <td className="p-4">{stat.avg_downtime_hours} ساعة</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-full bg-slate-200 rounded-full h-2.5 max-w-[100px]">
                                                            <div
                                                                className={`h-2.5 rounded-full ${stat.avg_asset_health_score > 80 ? 'bg-emerald-500' : stat.avg_asset_health_score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                style={{ width: `${stat.avg_asset_health_score}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-bold">{stat.avg_asset_health_score}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {branchStats.length === 0 && (
                        <div className="text-center py-20 text-slate-400 font-bold">
                            لا توجد بيانات للأداء حتى الآن.
                        </div>
                    )}
                </div>
            ) : (
                // INVENTORY VIEW
                <>
                    {inventoryStats ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-emerald-50 rounded-xl">
                                            <DollarSign className="w-6 h-6 text-emerald-600" />
                                        </div>
                                    </div>
                                    <p className="text-slate-500 text-sm font-bold">قيمة المخزون الكلية</p>
                                    <h3 className="text-3xl font-bold text-slate-900">{formatCurrency(inventoryStats.totalValue)}</h3>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-50 rounded-xl">
                                            <Package className="w-6 h-6 text-blue-600" />
                                        </div>
                                    </div>
                                    <p className="text-slate-500 text-sm font-bold">عدد القطع بالمخزن</p>
                                    <h3 className="text-3xl font-bold text-slate-900">{inventoryStats.totalItems}</h3>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-red-50 rounded-xl">
                                            <AlertTriangle className="w-6 h-6 text-red-600" />
                                        </div>
                                    </div>
                                    <p className="text-slate-500 text-sm font-bold">نواقص (Low Stock)</p>
                                    <h3 className="text-3xl font-bold text-slate-900">{inventoryStats.lowStockItems}</h3>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-lg text-slate-900 mb-6">الأكثر استهلاكاً (Top 5 Consumed)</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={inventoryStats.topConsumed} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" width={100} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                cursor={{ fill: '#f1f5f9' }}
                                            />
                                            <Bar dataKey="quantity" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={30} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
                            <p className="mt-4 text-slate-500">جاري تحليل بيانات المخزون...</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ReportsPage;
