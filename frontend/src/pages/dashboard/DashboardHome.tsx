import { useState, useMemo } from 'react';
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
    QrCode,
    Compass
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { AssetQRScanner } from '../../components/assets/AssetQRScanner';
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

    const kpis = useMemo(() => [
        {
            label: 'إجمالي البلاغات',
            value: total,
            icon: ClipboardList,
            color: 'from-blue-600/20 to-blue-900/40',
            border: 'border-blue-500/30',
            iconColor: 'text-blue-400',
            trend: '+5%'
        },
        {
            label: 'بلاغات مفتوحة',
            value: open,
            icon: Clock,
            color: 'from-amber-500/20 to-amber-900/40',
            border: 'border-amber-500/30',
            iconColor: 'text-amber-400',
            trend: 'نشط'
        },
        {
            label: 'حالات طارئة',
            value: emergency,
            icon: AlertTriangle,
            color: 'from-red-500/20 to-red-900/40',
            border: 'border-red-500/30',
            iconColor: 'text-red-400',
            trend: 'هام'
        },
        {
            label: 'أغلق اليوم',
            value: closedToday,
            icon: CheckCircle2,
            color: 'from-emerald-500/20 to-emerald-900/40',
            border: 'border-emerald-500/30',
            iconColor: 'text-emerald-400',
            trend: 'ممتاز'
        }
    ], [total, open, emergency, closedToday]);

    const priorityColors: Record<string, string> = useMemo(() => ({
        low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        urgent: 'bg-red-500/10 text-red-400 border-red-500/20'
    }), []);

    const statusLabels: Record<string, string> = useMemo(() => ({
        open: 'مفتوح',
        in_progress: 'قيد التنفيذ',
        closed: 'مغلق'
    }), []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] p-8 space-y-8 pb-20">
                <div className="flex justify-between items-center">
                    <div className="space-y-2">
                        <Skeleton width={200} height={32} className="bg-white/5" />
                        <Skeleton width={300} height={20} className="bg-white/5" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} height={160} className="rounded-3xl bg-white/5" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Skeleton height={400} className="rounded-3xl bg-white/5" />
                    <Skeleton height={400} className="rounded-3xl bg-white/5" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0f172a] to-black p-4 md:p-8 font-sans rtl space-y-12 pb-24" dir="rtl">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tight">المركز العصبي</h1>
                    <p className="text-white/40 font-medium">تحليلات الأداء السيادي والتشغيل الفوري</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => navigate('/tickets/new')}
                        className="flex-1 lg:flex-none bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-5 rounded-3xl font-black shadow-xl shadow-blue-900/40 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 group border border-white/10"
                    >
                        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                        بلاغ جديد
                    </button>
                    <button
                        onClick={() => setIsQRScannerOpen(true)}
                        className="flex-1 lg:flex-none bg-white/5 backdrop-blur-xl border border-white/10 text-white px-8 py-5 rounded-3xl font-black hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg"
                    >
                        <QrCode className="w-6 h-6 text-blue-400" />
                        مسح كود
                    </button>
                    {((userProfile?.role?.toLowerCase() === 'admin') || (userProfile?.role?.toLowerCase() === 'technician') || (userProfile?.role?.toLowerCase() === 'manager')) && (
                        <button
                            onClick={() => navigate('/maps')}
                            className="w-full lg:w-auto bg-white/5 backdrop-blur-xl border border-white/10 text-white px-8 py-5 rounded-3xl font-black hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg"
                        >
                            <Compass className="w-6 h-6 text-emerald-400" />
                            خريطة الفروع
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
                {kpis?.map((kpi, idx) => (
                    <div key={idx} className={`bg-gradient-to-br ${kpi.color} ${kpi.border} border backdrop-blur-2xl p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden group transition-all duration-500 hover:scale-[1.02]`}>
                        <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px]">
                            <div className="flex justify-between items-start">
                                <div className={`p-4 rounded-2xl bg-white/5 ${kpi.iconColor}`}>
                                    <kpi.icon className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                </div>
                                <span className="text-[10px] font-black bg-white/10 border border-white/10 px-3 py-1 rounded-full uppercase tracking-tighter text-white/60">
                                    {kpi.trend}
                                </span>
                            </div>
                            <div className="mt-6">
                                <p className="text-5xl font-black mb-1">{kpi.value}</p>
                                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{kpi.label}</p>
                            </div>
                        </div>
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] space-y-8">
                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-blue-500" />
                        توزيع الأعطال السيادية
                    </h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryDistribution || []} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    width={120}
                                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900' }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderRadius: '24px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 12, 12, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] space-y-8">
                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        الحالة التشغيلية للنظام
                    </h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusDistribution || []}
                                    cx="50%"
                                    cy="40%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {statusDistribution?.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderRadius: '24px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(10px)'
                                    }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px', color: 'rgba(255,255,255,0.4)', fontWeight: '900', fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Recent Activity */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white tracking-tight">الفعاليات الأخيرة</h2>
                    <button
                        onClick={() => navigate('/tickets')}
                        className="bg-white/5 px-6 py-2.5 rounded-xl text-blue-400 text-xs font-black flex items-center gap-2 hover:bg-white/10 transition-all border border-blue-500/20"
                    >
                        الأرشيف الكامل
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                </div>
                <div className="divide-y divide-white/5">
                    {(!recentTickets || recentTickets.length === 0) ? (
                        <div className="p-32 text-center text-white/20 font-black uppercase tracking-[0.2em] text-sm animate-pulse">
                            سكون مطلق... لا توجد بيانات مسجلة
                        </div>
                    ) : (
                        recentTickets?.map(ticket => (
                            <div
                                key={ticket.id}
                                onClick={() => navigate(`/tickets/${ticket.id}`)}
                                className="flex items-center gap-6 p-8 hover:bg-white/[0.03] transition-all cursor-pointer group"
                            >
                                <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:rotate-6 transition-transform">
                                    {ticket.branch.brand.logo_url ? (
                                        <img src={ticket.branch.brand.logo_url} alt="Brand" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <Building2 className="w-8 h-8 text-white/20" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-lg font-black text-white truncate group-hover:text-blue-400 transition-colors">
                                        {ticket.fault_category}
                                    </p>
                                    <p className="text-sm text-white/40 mt-1 font-medium flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        {ticket.branch.name_ar} • {ticket.branch.brand.name_ar}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-3 shrink-0">
                                    <span className={`text-[10px] font-black px-4 py-1.5 rounded-full border shadow-lg ${priorityColors[ticket.priority]}`}>
                                        {ticket.priority.toUpperCase()}
                                    </span>
                                    <span className="text-xs font-black text-white/20 uppercase tracking-widest leading-none">
                                        {statusLabels[ticket.status]}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
