import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    TrendingUp, TrendingDown, Activity, AlertTriangle,
    DollarSign, Clock, Package, BarChart3, PieChart as PieIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Mock Data for "Wow" factor initialization (will blend with real stats)
const SPENDING_DATA = [
    { name: 'يناير', repairs: 4000, inventory: 2400 },
    { name: 'فبراير', repairs: 3000, inventory: 1398 },
    { name: 'مارس', repairs: 2000, inventory: 9800 },
    { name: 'أبريل', repairs: 2780, inventory: 3908 },
    { name: 'مايو', repairs: 1890, inventory: 4800 },
    { name: 'يونيو', repairs: 2390, inventory: 3800 },
    { name: 'يوليو', repairs: 3490, inventory: 4300 },
];

const FAULT_DISTRIBUTION = [
    { name: 'كهرباء', value: 400 },
    { name: 'سباكة', value: 300 },
    { name: 'تكييف', value: 300 },
    { name: 'معدات', value: 200 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const DashboardAnalytics = () => {
    const [stats, setStats] = useState({
        totalSpend: 0,
        avgEfficiency: '4.2', // Days
        criticalFaults: 0,
        inventoryAlerts: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRealStats();
    }, []);

    const fetchRealStats = async () => {
        try {
            // Fetch Critical Faults
            const { count: urgentCount } = await supabase
                .from('tickets')
                .select('*', { count: 'exact', head: true })
                .eq('priority', 'urgent')
                .neq('status', 'closed');

            // Fetch Inventory Alerts (Low Stock)
            const { count: lowStockCount } = await supabase
                .from('spare_parts')
                .select('*', { count: 'exact', head: true })
                .lt('quantity', 10); // Assuming 10 is threshold

            setStats(prev => ({
                ...prev,
                criticalFaults: urgentCount || 0,
                inventoryAlerts: lowStockCount || 0,
                totalSpend: 154200, // Mocked for now as we don't have cost columns yet
            }));
            setLoading(false);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setLoading(false);
        }
    };

    const KPICard = ({ title, value, icon: Icon, trend, color }: any) => (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                    <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
                </div>
                {trend && (
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

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-8 font-sans" dir="rtl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">لوحة التحليلات التنفيذية</h1>
                <p className="text-slate-500 text-sm">نظرة شاملة على أداء الصيانة والعمليات</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard
                    title="إجمالي الإنفاق (سنوي)"
                    value={`${stats.totalSpend.toLocaleString()} ج.م`}
                    icon={DollarSign}
                    trend={12}
                    color="text-blue-600 bg-blue-600"
                />
                <KPICard
                    title="كفاءة الإغلاق (متوسط)"
                    value={`${stats.avgEfficiency} يوم`}
                    icon={Clock}
                    trend={-5}
                    color="text-purple-600 bg-purple-600"
                />
                <KPICard
                    title="أعطال حرجة (مفتوحة)"
                    value={stats.criticalFaults}
                    icon={AlertTriangle}
                    trend={0}
                    color="text-red-600 bg-red-600"
                />
                <KPICard
                    title="تنبيهات المخزون"
                    value={stats.inventoryAlerts}
                    icon={Package}
                    trend={8}
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
                            اتجاه الإنفاق الشهري
                        </h3>
                    </div>
                    <div className="h-80 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={SPENDING_DATA}>
                                <defs>
                                    <linearGradient id="colorRepairs" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorInventory" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="repairs" stroke="#8884d8" fillOpacity={1} fill="url(#colorRepairs)" name="إصلاحات" />
                                <Area type="monotone" dataKey="inventory" stroke="#82ca9d" fillOpacity={1} fill="url(#colorInventory)" name="قطع غيار" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Fault Distribution */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <PieIcon className="w-5 h-5 text-purple-500" />
                            توزيع الأعطال حسب الفئة
                        </h3>
                    </div>
                    <div className="h-80 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={FAULT_DISTRIBUTION}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    label
                                >
                                    {FAULT_DISTRIBUTION.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardAnalytics;
