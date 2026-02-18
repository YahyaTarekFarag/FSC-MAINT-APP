import { useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import {
    ClipboardList,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Plus,
    Building2,
    TrendingUp,
    ArrowRight,
    AlertCircle,
    QrCode
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { AssetQRScanner } from '../../components/assets/AssetQRScanner';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import type { Database } from '../../lib/supabase';

interface DashboardHomeProps {
    userProfile: Database['public']['Tables']['profiles']['Row'] | null;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const DashboardHome: React.FC<DashboardHomeProps> = ({ userProfile }) => {
    const navigate = useNavigate();
    const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
    const {
        total,
        open,
        emergency,
        closedToday,
        statusDistribution,
        categoryDistribution,
        recentTickets,
        loading
    } = useDashboardStats(userProfile);

    if (loading) {
        return (
            <div className="space-y-8 pb-20">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton width={200} height={32} />
                        <Skeleton width={300} height={20} />
                    </div>
                    <div className="flex gap-3">
                        <Skeleton width={120} height={48} variant="rectangular" className="rounded-2xl" />
                        <Skeleton width={120} height={48} variant="rectangular" className="rounded-2xl" />
                    </div>
                </div>

                {/* KPIs Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} height={160} className="rounded-3xl" />
                    ))}
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Skeleton height={400} className="rounded-3xl" />
                    <Skeleton height={400} className="rounded-3xl" />
                </div>
            </div>
        );
    }

    const kpis = [
        {
            label: 'إجمالي البلاغات',
            value: total,
            icon: ClipboardList,
            color: 'bg-blue-600',
            shadow: 'shadow-blue-100',
            trend: '+5%'
        },
        {
            label: 'بلاغات مفتوحة',
            value: open,
            icon: Clock,
            color: 'bg-amber-500',
            shadow: 'shadow-amber-100',
            trend: 'نشط'
        },
        {
            label: 'حالات طارئة',
            value: emergency,
            icon: AlertTriangle,
            color: 'bg-red-500',
            shadow: 'shadow-red-100',
            trend: 'هام'
        },
        {
            label: 'أغلق اليوم',
            value: closedToday,
            icon: CheckCircle2,
            color: 'bg-emerald-500',
            shadow: 'shadow-emerald-100',
            trend: 'ممتاز'
        }
    ];

    const priorityColors: Record<string, string> = {
        low: 'bg-slate-100 text-slate-500',
        medium: 'bg-blue-50 text-blue-600',
        high: 'bg-orange-50 text-orange-600',
        urgent: 'bg-red-50 text-red-600'
    };

    const statusLabels: Record<string, string> = {
        open: 'مفتوح',
        in_progress: 'قيد التنفيذ',
        closed: 'مغلق'
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">لوحة المتابعة</h1>
                    <p className="text-slate-500 mt-1">نظرة شاملة على أداء الصيانة والتشغيل</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/tickets/new')}
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 shrink-0"
                    >
                        <Plus className="w-5 h-5" />
                        بلاغ جديد
                    </button>
                    <button
                        onClick={() => setIsQRScannerOpen(true)}
                        className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 shrink-0"
                    >
                        <QrCode className="w-5 h-5" />
                        مسح كود
                    </button>
                    {userProfile?.role === 'admin' && (
                        <button
                            onClick={() => navigate('/admin/assets')}
                            className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm shrink-0"
                        >
                            <Building2 className="w-5 h-5" />
                            الأصول
                        </button>
                    )}
                </div>
            </div>

            <AssetQRScanner
                isOpen={isQRScannerOpen}
                onClose={() => setIsQRScannerOpen(false)}
                onScanSuccess={(assetId) => navigate(`/tickets/new?asset_id=${assetId}`)}
            />

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, idx) => (
                    <div key={idx} className={`${kpi.color} p-6 rounded-3xl text-white shadow-xl ${kpi.shadow} relative overflow-hidden group`}>
                        <div className="relative z-10 flex flex-col justify-between h-full min-h-[120px]">
                            <div className="flex justify-between items-start">
                                <kpi.icon className="w-8 h-8 opacity-80 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-full uppercase tracking-tighter">
                                    {kpi.trend}
                                </span>
                            </div>
                            <div>
                                <p className="text-4xl font-black mb-1">{kpi.value}</p>
                                <p className="text-white/80 text-xs font-bold uppercase tracking-widest">{kpi.label}</p>
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bar Chart: Fault Categories */}
                <Card className="p-8 space-y-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        توزيع الأعطال حسب القسم
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={categoryDistribution}
                                layout="vertical"
                                margin={{ left: 20 }}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onClick={(data: any) => {
                                    if (data && data.activePayload && data.activePayload.length > 0) {
                                        const categoryName = data.activePayload[0].payload.name;
                                        navigate(`/tickets?search=${encodeURIComponent(categoryName)}`);
                                    }
                                }}
                                className="cursor-pointer"
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    width={100}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Pie Chart: Status Distribution */}
                <Card className="p-8 space-y-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        حالة البلاغات الحالية
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    onClick={(data: any) => {
                                        if (data && data.payload && data.payload.key) {
                                            navigate(`/tickets?status=${data.payload.key}`);
                                        }
                                    }}
                                    className="cursor-pointer"
                                >
                                    {statusDistribution.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Bottom Section: Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 overflow-hidden border-0">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-900">أحدث النشاطات</h2>
                        <button
                            onClick={() => navigate('/tickets')}
                            className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline"
                        >
                            عرض كل البلاغات
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {recentTickets.length === 0 ? (
                            <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                                لا يوجد نشاط مؤخرًا
                            </div>
                        ) : (
                            recentTickets.map(ticket => (
                                <div
                                    key={ticket.id}
                                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                                    className="flex items-center gap-4 p-6 hover:bg-slate-50 transition-colors cursor-pointer group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                                        {ticket.branch.brand.logo_url ? (
                                            <img src={ticket.branch.brand.logo_url} alt="Brand" className="w-full h-full object-cover" />
                                        ) : (
                                            <AlertCircle className="w-6 h-6 text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                            {ticket.fault_category} - {ticket.branch.name_ar}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1 font-bold">
                                            {new Date(ticket.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })} • {ticket.branch.brand.name_ar}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 shrink-0">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${priorityColors[ticket.priority]}`}>
                                            {ticket.priority.toUpperCase()}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            {statusLabels[ticket.status]}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Quick Help/Tip */}
                <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col justify-center">
                    <div className="relative z-10 space-y-6">
                        <div className="bg-blue-500/20 p-3 rounded-2xl w-fit">
                            <AlertCircle className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-2xl font-bold leading-tight">جاهز لجدولة موعد الصيانة؟</h3>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            تأكد من مراجعة البلاغات الطارئة أولاً. تحديثك المستمر لحالة البلاغ يساعد المديرين على تتبع نسبة الإنجاز بدقة.
                        </p>
                        <button
                            onClick={() => navigate('/tickets')}
                            className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                        >
                            متابعة العمل
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-blue-600/20 rounded-full blur-3xl"></div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
