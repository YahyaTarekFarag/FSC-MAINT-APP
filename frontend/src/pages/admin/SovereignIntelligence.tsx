import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis,
    Cell
} from 'recharts';
import {
    Activity, Shield, Zap, TrendingUp,
    ArrowRight, Map as MapIcon, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const SovereignIntelligence = () => {
    const [loading, setLoading] = useState(true);
    const [forecasts, setForecasts] = useState<any[]>([]);
    const [brandAnalysis, setBrandAnalysis] = useState<any[]>([]);
    const [riskHeatmap, setRiskHeatmap] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                { data: forecastData },
                { data: brandData },
                { data: riskData }
            ] = await Promise.all([
                supabase.from('v_maintenance_forecasts').select('*').order('days_until_failure', { ascending: true }).limit(6),
                supabase.from('v_brand_reliability_analysis').select('*').order('failure_rate_per_unit', { ascending: true }),
                supabase.from('v_operational_risk_heatmap').select('*').order('aggregate_risk_score', { ascending: false })
            ]);

            setForecasts(forecastData || []);
            setBrandAnalysis(brandData || []);
            setRiskHeatmap(riskData || []);
        } catch (err) {
            console.error('Intelligence Fetch Error:', err);
            toast.error('فشل في مزامنة البيانات السيادية');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleConvertToPMTicket = async (forecast: any) => {
        const confirm = window.confirm(`هل تريد تحويل التنبؤ لـ ${forecast.asset_name} إلى بلاغ صيانة وقائية؟`);
        if (!confirm) return;

        try {
            const { error } = await (supabase.from('tickets') as any).insert({
                asset_id: forecast.asset_id,
                branch_id: forecast.branch_id,
                title: `صيانة وقائية تنبؤية: ${forecast.asset_name}`,
                description: `بلاغ مولد آلياً بناءً على تحليل MTBF. التاريخ المتوقع للفشل: ${forecast.projected_failure_date}`,
                priority: forecast.forecast_status === 'CRITICAL' ? 'urgent' : 'medium',
                status: 'open',
                fault_type: 'صيانة وقائية'
            });

            if (error) throw error;
            toast.success('تم إنشاء بلاغ الصيانة الوقائية بنجاح');
            fetchData();
        } catch (err) {
            console.error('PM Conversion Error:', err);
            toast.error('فشل في إنشاء البلاغ');
        }
    };

    const RiskBadge = ({ status }: { status: string }) => {
        const styles: any = {
            CRITICAL: 'bg-red-500/20 text-red-500 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)]',
            URGENT: 'bg-amber-500/20 text-amber-500 border-amber-500/50',
            PROACTIVE: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
            STABLE: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter border animate-pulse ${styles[status] || styles.STABLE}`}>
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 w-8 h-8 animate-pulse" />
                </div>
                <div className="text-white/40 font-black tracking-[0.5em] uppercase text-xs animate-pulse">Initializing Neural Intelligence...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-12 font-sans rtl" dir="rtl">
            {/* Ambient Background */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(37,99,235,0.07),_transparent_50%)] pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_100%_100%,_rgba(99,102,241,0.05),_transparent_40%)] pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto space-y-12">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-blue-400 font-black uppercase tracking-[0.3em] text-xs">
                            <Shield className="w-4 h-4" />
                            Sovereign Ops Intelligence
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter text-white">
                            مركز <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500">التنبؤ الرقمي</span>
                        </h1>
                        <p className="text-white/40 text-lg font-medium max-w-xl leading-relaxed">
                            تحليل MTBF المتقدم ونماذج الموثوقية للتنبؤ بالأعطال قبل وقوعها وتحسين كفاءة التشغيل.
                        </p>
                    </div>

                    <button onClick={fetchData} className="group bg-white/5 border border-white/10 p-5 rounded-3xl hover:bg-white/10 transition-all">
                        <RefreshCw className="w-6 h-6 text-blue-400 group-hover:rotate-180 transition-transform duration-700" />
                    </button>
                </header>

                {/* Main Intelligence Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Failure Forecast Table */}
                    <div className="lg:col-span-2 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-600/10 transition-colors" />

                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-600/20 p-4 rounded-2xl border border-blue-500/30">
                                    <Zap className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">توقعات الأعطال القادمة</h3>
                                    <p className="text-white/20 text-xs font-bold uppercase tracking-widest mt-1">Next 30 Days Projection</p>
                                </div>
                            </div>
                            <Activity className="w-6 h-6 text-white/10" />
                        </div>

                        <div className="space-y-4 relative z-10">
                            {forecasts.map((f: any) => (
                                <div key={f.asset_id} className="flex items-center justify-between p-6 bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 rounded-3xl transition-all group/item">
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-lg font-black tracking-tight">{f.asset_name}</span>
                                            <span className="text-white/30 text-xs font-medium">{f.brand_name}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-12 text-right">
                                        <div className="hidden md:flex flex-col gap-1">
                                            <span className="text-white/20 text-[10px] font-black uppercase tracking-widest">Expected In</span>
                                            <span className="text-white font-bold">{f.days_until_failure} يوم</span>
                                        </div>
                                        <RiskBadge status={f.forecast_status} />
                                        <button
                                            onClick={() => handleConvertToPMTicket(f)}
                                            className="p-3 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Operational Risk Heatmap Widget */}
                    <div className="bg-slate-900 rounded-[3rem] border border-white/10 p-10 shadow-2xl flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-8">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black tracking-tight">نقاط الضغط</h3>
                                    <p className="text-white/20 text-xs font-bold uppercase tracking-widest">Critical Ops Heatmap</p>
                                </div>
                                <MapIcon className="w-6 h-6 text-blue-500/50" />
                            </div>

                            <div className="space-y-8">
                                {riskHeatmap.slice(0, 5).map((r: any) => (
                                    <div key={r.branch_id} className="space-y-3">
                                        <div className="flex justify-between items-end">
                                            <span className="font-bold text-sm">{r.branch_name}</span>
                                            <span className="text-xs text-blue-400 font-black">{r.aggregate_risk_score} Score</span>
                                        </div>
                                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full bg-gradient-to-l from-blue-500 to-indigo-600 rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (r.aggregate_risk_score / 20) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/20">
                                            <span>Open: {r.open_tickets}</span>
                                            <span>Predictive: {r.projected_failures}</span>
                                            <span>Stock: {r.stock_alerts}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button className="w-full mt-10 py-5 bg-white text-slate-950 rounded-[1.5rem] font-black text-sm tracking-tight hover:scale-[1.02] active:scale-95 transition-all">
                            تحليل المخاطر الشامل
                        </button>
                    </div>

                    {/* Brand Reliability Radar */}
                    <div className="lg:col-span-1 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-10 shadow-2xl">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="bg-indigo-600/20 p-4 rounded-2xl border border-indigo-500/30">
                                <Activity className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tight">تحليل موثوقية العلامات</h3>
                                <p className="text-white/20 text-xs font-bold uppercase tracking-widest mt-1">Brand Reliability (MTBF)</p>
                            </div>
                        </div>

                        <div className="h-[300px] w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={brandAnalysis.slice(0, 6)}>
                                    <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                    <PolarAngleAxis dataKey="brand_name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                                    <Radar
                                        name="MTBF Average"
                                        dataKey="brand_mtbf_avg"
                                        stroke="#818cf8"
                                        fill="#818cf8"
                                        fillOpacity={0.3}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Operational Trend Analysis */}
                    <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-[3rem] p-10 shadow-2xl overflow-hidden group">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="bg-emerald-600/20 p-4 rounded-2xl border border-emerald-500/30">
                                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h3 className="text-2xl font-black tracking-tight">معدلات الفشل لكل وحدة</h3>
                            </div>
                        </div>

                        <div className="h-[300px] w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={brandAnalysis}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                    <XAxis dataKey="brand_name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 11 }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                                    />
                                    <Bar dataKey="failure_rate_per_unit" radius={[10, 10, 0, 0]}>
                                        {brandAnalysis.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SovereignIntelligence;
