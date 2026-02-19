import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Coins,
    Calendar,
    ArrowRight,
    Loader2,
    CheckCircle2,
    Star,
    Wrench,
    CreditCard,
    TrendingUp,
    ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface TechnicianPerformance {
    technician_id: string;
    full_name: string;
    closure_month: string;
    total_tickets_closed: number;
    average_rating: number;
    total_parts_cost: number;
    total_expenses: number;
}

export default function PayrollDashboard() {
    const navigate = useNavigate();
    const [performance, setPerformance] = useState<TechnicianPerformance[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPerformance = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('view_technician_monthly_closure')
                .select('*')
                .order('closure_month', { ascending: false });

            if (error) throw error;
            setPerformance(data || []);
        } catch (err) {
            console.error('Performance Fetch Error:', err);
            toast.error('فشل تحميل بيانات الأداء والرواتب');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPerformance();
    }, [fetchPerformance]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                <h2 className="text-slate-900 font-black text-xl">جاري احتساب مؤشرات الأداء والرواتب...</h2>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/console')}
                        className="bg-white p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all text-slate-400 group"
                    >
                        <ArrowRight className="w-6 h-6 group-hover:text-blue-600" />
                    </button>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            الأداء المالي للفنيين
                        </h1>
                        <p className="text-slate-500 font-bold mt-1">متابعة الإغلاقات، التقييمات، والتكاليف التشغيلية</p>
                    </div>
                </div>

                <div className="bg-emerald-600 text-white p-6 rounded-[2rem] shadow-xl shadow-emerald-200 flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">إجمالي الوفورات</p>
                        <p className="text-2xl font-black font-mono">24,500 <span className="text-sm">ج.م</span></p>
                    </div>
                </div>
            </header>

            {/* Performance Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {performance.map((tech) => (
                    <div key={`${tech.technician_id}-${tech.closure_month}`} className="bg-white rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col">
                        {/* Technical Month Header */}
                        <div className="bg-slate-900 p-8 text-white">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-white/10 rounded-2xl">
                                    <Calendar className="w-6 h-6 text-blue-400" />
                                </div>
                                {tech.average_rating >= 4.5 && (
                                    <div className="bg-amber-400 text-slate-900 px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-lg shadow-amber-400/20">
                                        <Star className="w-3 h-3 fill-current" />
                                        أداء ذهبي
                                    </div>
                                )}
                            </div>
                            <h3 className="text-2xl font-black truncate">{tech.full_name}</h3>
                            <p className="text-blue-400 font-bold text-sm tracking-widest uppercase mt-1">
                                {new Date(tech.closure_month).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                            </p>
                        </div>

                        {/* KPI Metrics */}
                        <div className="p-8 space-y-6 flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <MetricCard
                                    label="إغلاقات ناجحة"
                                    value={tech.total_tickets_closed}
                                    icon={CheckCircle2}
                                    color="text-emerald-600"
                                    bgColor="bg-emerald-50"
                                />
                                <MetricCard
                                    label="متوسط التقييم"
                                    value={tech.average_rating}
                                    icon={Star}
                                    color="text-amber-500"
                                    bgColor="bg-amber-50"
                                    suffix="/ 5"
                                />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <Wrench className="w-4 h-4 text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase">تكلفة قطع الغيار</span>
                                    </div>
                                    <span className="text-slate-900 font-black font-mono">{tech.total_parts_cost.toLocaleString()} ج.م</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="w-4 h-4 text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase">عهدة / مصروفات</span>
                                    </div>
                                    <span className="text-slate-900 font-black font-mono">{tech.total_expenses.toLocaleString()} ج.م</span>
                                </div>
                            </div>

                            <button className="w-full mt-4 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all">
                                عرض التفاصيل كاملة
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {performance.length === 0 && (
                <div className="bg-white p-20 rounded-[3rem] border border-dashed border-slate-200 text-center space-y-4">
                    <div className="p-6 bg-slate-50 rounded-full w-fit mx-auto">
                        <Coins className="w-12 h-12 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold text-xl">لا توجد سجلات أداء لهذا الشهر حتى الآن</p>
                </div>
            )}
        </div>
    );
}

const MetricCard = ({ label, value, icon: Icon, color, bgColor, suffix = '' }: any) => (
    <div className={`${bgColor} p-4 rounded-3xl space-y-2`}>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color} bg-white shadow-sm`}>
            <Icon className="w-4 h-4" />
        </div>
        <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
            <p className={`text-xl font-black ${color} font-mono`}>{value}{suffix}</p>
        </div>
    </div>
);
