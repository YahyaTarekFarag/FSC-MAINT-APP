import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
    Activity, Shield, Zap,
    ArrowRight, Map as MapIcon, RefreshCw, Calendar, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import InventoryForecastDrawer from '../../components/inventory/InventoryForecastDrawer';

const SovereignIntelligence = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [forecasts, setForecasts] = useState<any[]>([]);
    const [brandAnalysis, setBrandAnalysis] = useState<any[]>([]);
    const [riskHeatmap, setRiskHeatmap] = useState<any[]>([]);
    const [roiAnalysis, setRoiAnalysis] = useState<any[]>([]);
    const [pmGaps, setPmGaps] = useState<any[]>([]);
    const [stockRisk, setStockRisk] = useState<any[]>([]);
    const [selectedPart, setSelectedPart] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                forecastRes,
                brandRes,
                riskRes,
                roiRes,
                gapRes,
                stockRes
            ] = await Promise.all([
                supabase.from('v_maintenance_forecasts').select('*').order('days_until_failure', { ascending: true }).limit(6),
                supabase.from('v_brand_reliability_analysis').select('*').order('brand_mtbf_avg', { ascending: false }),
                supabase.from('v_operational_risk_heatmap').select('*').order('aggregate_risk_score', { ascending: false }),
                supabase.from('v_asset_roi_analysis').select('*').order('cost_to_purchase_ratio', { ascending: false }).limit(4),
                supabase.from('v_pm_intelligence_gap').select('*').limit(5),
                supabase.from('v_inventory_risk_index').select('*').order('days_of_coverage', { ascending: true }).limit(5)
            ]);

            if (forecastRes.error) throw forecastRes.error;
            if (brandRes.error) throw brandRes.error;
            if (riskRes.error) throw riskRes.error;
            if (roiRes.error) throw roiRes.error;
            if (gapRes.error) throw gapRes.error;
            if (stockRes.error) throw stockRes.error;

            setForecasts(forecastRes.data || []);
            setBrandAnalysis(brandRes.data || []);
            setRiskHeatmap(riskRes.data || []);
            setRoiAnalysis(roiRes.data || []);
            setPmGaps(gapRes.data || []);
            setStockRisk(stockRes.data || []);
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
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => navigate(`/admin/scheduler?assetId=${f.asset_id}&branchId=${f.branch_id}`)}
                                                className="p-3 bg-emerald-600/10 text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                                                title="Smart Schedule"
                                            >
                                                <Calendar className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleConvertToPMTicket(f)}
                                                className="p-3 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                                                title="One-time PM"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
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

                        <div className="mt-10 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl space-y-4">
                            <div className="flex items-center gap-3 text-red-400">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="font-black text-xs uppercase tracking-widest">Intelligence Gap</span>
                            </div>
                            <p className="text-white/40 text-[10px] leading-relaxed">
                                تم رصد <span className="text-white font-bold">{pmGaps.length}</span> معدة عالية المخاطر ليس لها جدول صيانة دورية مفعل.
                            </p>
                            <button
                                onClick={() => navigate('/admin/scheduler')}
                                className="w-full py-3 bg-red-600/20 text-red-500 border border-red-500/30 rounded-xl font-bold text-xs hover:bg-red-600 hover:text-white transition-all"
                            >
                                معالجة فجوات الصيانة
                            </button>
                        </div>
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
                                        stroke="#3b82f6"
                                        fill="#3b82f6"
                                        fillOpacity={0.3}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* ROI & TCO Intelligence */}
                    <div className="lg:col-span-3 bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-10 shadow-2xl space-y-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="bg-amber-600/20 p-4 rounded-2xl border border-amber-500/30">
                                    <Shield className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">مؤشر العائد على الأصول (ROI)</h3>
                                    <p className="text-white/20 text-xs font-bold uppercase tracking-widest mt-1">Asset Asset Efficiency & TCO Analytics</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {roiAnalysis.map((asset: any) => (
                                <div key={asset.id} className="bg-white/[0.03] p-8 rounded-[2rem] border border-white/5 flex flex-col justify-between group hover:bg-white/[0.05] transition-all">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{asset.branch_name}</span>
                                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black ${asset.cost_to_purchase_ratio > 50 ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                                {asset.cost_to_purchase_ratio.toFixed(1)}% Ratio
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-lg leading-tight">{asset.name}</h4>
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-white/40">سعر الشراء</span>
                                            <span>{asset.purchase_price}$</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-white/40">تكلفة الصيانة</span>
                                            <span className="text-red-400">{asset.total_repair_cost}$</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${asset.cost_to_purchase_ratio > 50 ? 'bg-red-500' : 'bg-blue-500'}`}
                                                style={{ width: `${Math.min(100, asset.cost_to_purchase_ratio)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Stock Intelligence Widget */}
                    <div className="bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-10 shadow-2xl relative overflow-hidden group">
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="bg-emerald-600/20 p-4 rounded-2xl border border-emerald-500/30">
                                    <Activity className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">مخاطر المخزون</h3>
                                    <p className="text-white/20 text-xs font-bold uppercase tracking-widest mt-1">JIT Stock Intelligence</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 relative z-10">
                            {stockRisk.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        setSelectedPart(item);
                                        setIsDrawerOpen(true);
                                    }}
                                    className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:border-blue-500/30 hover:bg-white/10 transition-all cursor-pointer group/item"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-black text-white">{item.part_name}</h4>
                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">SKU: {item.sku}</span>
                                        </div>
                                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${item.stock_status === 'critical' ? 'bg-red-500/20 text-red-400' :
                                            item.stock_status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-emerald-500/20 text-emerald-400'
                                            }`}>
                                            {item.stock_status}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-tight">Days of Coverage</p>
                                            <p className={`text-2xl font-black ${item.days_of_coverage < 5 ? 'text-red-400' :
                                                item.days_of_coverage < 15 ? 'text-amber-400' :
                                                    'text-white'
                                                }`}>
                                                {item.days_of_coverage > 365 ? '>365' : item.days_of_coverage} <span className="text-xs text-white/20">يوم</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-tight">Projected Demand</p>
                                            <p className="text-lg font-black text-blue-400">{item.projected_30d_demand} <span className="text-[10px] text-white/20">وحدة</span></p>
                                        </div>
                                    </div>
                                    <div className="mt-4 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${item.stock_status === 'critical' ? 'bg-red-500' :
                                                item.stock_status === 'warning' ? 'bg-amber-500' :
                                                    'bg-emerald-500'
                                                }`}
                                            style={{ width: `${Math.min(100, (item.current_stock / (item.projected_30d_demand || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {stockRisk.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-white/20 font-bold">لا توجد مخاطر مخزون حالياً</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <InventoryForecastDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                part={selectedPart}
            />
        </div>
    );
};

export default SovereignIntelligence;
