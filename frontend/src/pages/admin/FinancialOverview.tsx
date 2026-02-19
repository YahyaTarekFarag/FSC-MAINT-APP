import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Coins,
    AlertTriangle,
    TrendingUp,
    Building2,
    ArrowRight,
    Loader2,
    BarChart3,
    PieChart,
    Activity,
    DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface AssetROI {
    asset_id: string;
    asset_name: string;
    branch_name: string;
    total_maintenance_cost: number;
    purchase_price: number;
    roi_status: string;
}

interface BranchBudget {
    branch_id: string;
    branch_name: string;
    monthly_budget: number;
    current_spend: number;
    budget_usage_percent: number;
    health_status: string;
}

export default function FinancialOverview() {
    const navigate = useNavigate();
    const [roiData, setRoiData] = useState<AssetROI[]>([]);
    const [budgetData, setBudgetData] = useState<BranchBudget[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [roiRes, budgetRes] = await Promise.all([
                supabase.from('v_asset_roi_analysis').select('*').limit(10),
                supabase.from('v_branch_budget_health').select('*').order('budget_usage_percent', { ascending: false })
            ]);

            if (roiRes.error) throw roiRes.error;
            if (budgetRes.error) throw budgetRes.error;

            setRoiData(roiRes.data || []);
            setBudgetData(budgetRes.data || []);
        } catch (err) {
            console.error('Financial Data Fetch Error:', err);
            toast.error('فشل تحميل البيانات المالية السيادية');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                <h2 className="text-slate-900 font-black text-xl">جاري استدعاء السجلات المالية...</h2>
            </div>
        );
    }

    const totalSpend = budgetData.reduce((acc, b) => acc + (Number(b.current_spend) || 0), 0);
    const totalBudget = budgetData.reduce((acc, b) => acc + (Number(b.monthly_budget) || 0), 0);
    const overallHealth = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0;

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200">
                            <Coins className="w-8 h-8 text-white" />
                        </div>
                        القيادة المالية السيادية
                    </h1>
                    <p className="text-slate-500 font-bold mt-2 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        مراقبة حية للتكاليف والميزانيات وعائد الاستثمار
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">نسبة الإنفاق الكلية</p>
                        <p className={`text-2xl font-black ${overallHealth > 90 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {overallHealth.toFixed(1)}%
                        </p>
                    </div>
                </div>
            </header>

            {/* Macro Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-loose">إجمالي الإنفاق الشهري</p>
                        <p className="text-3xl font-black text-slate-900 font-mono">{(totalSpend || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ج.م</span></p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                        <PieChart className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-loose">الميزانية المخصصة</p>
                        <p className="text-3xl font-black text-slate-900 font-mono">{(totalBudget || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ج.م</span></p>
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl space-y-4 relative overflow-hidden">
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-loose">الوفورات المتوقعة (SLA)</p>
                            <p className="text-3xl font-black text-white font-mono">12,450 <span className="text-sm font-bold text-slate-500">ج.م</span></p>
                        </div>
                    </div>
                    <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Branch Budget Health */}
                <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900">صحة ميزانيات الفروع</h2>
                        </div>
                        <span className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">عرض الكل</span>
                    </div>

                    <div className="space-y-4">
                        {budgetData.map((branch) => (
                            <div key={branch.branch_id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-lg hover:border-blue-100 transition-all group">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <p className="font-black text-slate-900">{branch.branch_name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">
                                            الميزانية: {(branch.monthly_budget || 0).toLocaleString()} ج.م
                                        </p>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full text-xs font-black ${branch.health_status === 'Critical' ? 'bg-red-50 text-red-600' :
                                        branch.health_status === 'Warning' ? 'bg-amber-50 text-amber-600' :
                                            'bg-emerald-50 text-emerald-600'
                                        }`}>
                                        {branch.health_status === 'Critical' ? 'حرج' : branch.health_status === 'Warning' ? 'تحذير' : 'آمن'}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-slate-500">الإنفاق الحالي</span>
                                        <span className="text-slate-900">{(branch.current_spend || 0).toLocaleString()} ج.م</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${branch.budget_usage_percent > 90 ? 'bg-red-500' :
                                                branch.budget_usage_percent > 75 ? 'bg-amber-500' :
                                                    'bg-blue-600'
                                                }`}
                                            style={{ width: `${Math.min(branch.budget_usage_percent, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-right text-slate-400 font-black">{branch.budget_usage_percent.toFixed(1)}% مستهلك</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Asset ROI Analysis (Repair vs Replace) */}
                <section className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900">تحليل Repair vs Replace</h2>
                        </div>
                        <div className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black animate-pulse">
                            عالية المخاطر
                        </div>
                    </div>

                    <div className="space-y-4">
                        {roiData.filter(a => a.roi_status !== 'Healthy').map((asset) => (
                            <div key={asset.asset_id} className="p-6 border border-slate-100 rounded-3xl space-y-4 hover:bg-slate-50/50 transition-all">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-black text-slate-800">{asset.asset_name}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold">{asset.branch_name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400 font-black uppercase">عجز التكلفة</p>
                                        <p className="text-lg font-black text-red-600 font-mono">
                                            +{((asset.total_maintenance_cost || 0) - (asset.purchase_price || 0)).toLocaleString()} <span className="text-[10px]">ج.م</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-2xl">
                                        <p className="text-[8px] text-slate-400 font-black uppercase mb-1">سعر الشراء</p>
                                        <p className="text-sm font-bold text-slate-700">{asset.purchase_price.toLocaleString()} ج.م</p>
                                    </div>
                                    <div className="bg-red-50/30 p-3 rounded-2xl border border-red-50">
                                        <p className="text-[8px] text-red-400 font-black uppercase mb-1">إجمالي الصيانة</p>
                                        <p className="text-sm font-bold text-red-700">{(asset.total_maintenance_cost || 0).toLocaleString()} ج.م</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`/assets/${asset.asset_id}`)}
                                    className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                                >
                                    عرض تقرير الإهلاك
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {roiData.length === 0 && (
                            <div className="py-20 text-center opacity-30">
                                <BarChart3 className="w-12 h-12 mx-auto mb-4" />
                                <p className="font-bold">لا توجد أصول تحتاج للاستبدال حالياً</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
