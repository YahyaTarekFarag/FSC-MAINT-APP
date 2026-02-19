import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Plus, Trash2, Settings, Layers, Box, Loader2, ArrowRight, Shield, RefreshCw, Archive, ArchiveRestore
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSovereignQuery } from '../../../hooks/useSovereignQuery';
import { useSovereignMutation } from '../../../hooks/useSovereignMutation';

const MasterDataManager = () => {
    const [activeTab, setActiveTab] = useState<'brands' | 'units' | 'settings'>('brands');
    const [showArchived, setShowArchived] = useState(false);

    // Brand Forms
    const [newBrandName, setNewBrandName] = useState('');

    // Unit Forms
    const [newUnitName, setNewUnitName] = useState('');

    // Settings State
    const [slaThreshold, setSlaThreshold] = useState(24);
    const [lowStockThreshold, setLowStockThreshold] = useState(5);
    const [savingSettings, setSavingSettings] = useState(false);

    // Queries & Mutations
    const { data: brands, loading: loadingBrands, refetch: refetchBrands } = useSovereignQuery({
        table: 'brands',
        showArchived,
        orderBy: { column: 'name_ar', ascending: true }
    });

    const { data: units, refetch: refetchUnits } = useSovereignQuery({
        table: 'unit_types',
        showArchived: false,
        orderBy: { column: 'name_ar', ascending: true }
    });

    const { createRecord: createBrand, softDeleteRecord: archiveBrand, restoreRecord: restoreBrand } = useSovereignMutation({ table_name: 'brands' });
    const { createRecord: createUnit } = useSovereignMutation({ table_name: 'unit_types' });

    const handleAddBrand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBrandName.trim()) return;
        const { error } = await createBrand({ name_ar: newBrandName.trim() });
        if (!error) {
            setNewBrandName('');
            refetchBrands();
        }
    };

    const handleArchiveBrand = async (id: string, name: string) => {
        if (window.confirm(`هل أنت متأكد من أرشفة العلامة التجارية: ${name}؟`)) {
            const { error } = await archiveBrand(id);
            if (!error) refetchBrands();
        }
    };

    const handleRestoreBrand = async (id: string) => {
        const { error } = await restoreBrand(id);
        if (!error) refetchBrands();
    };

    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUnitName.trim()) return;
        const { error } = await createUnit({ name_ar: newUnitName.trim() });
        if (!error) {
            setNewUnitName('');
            refetchUnits();
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const { error: err1 } = await (supabase.from('system_config') as any).upsert(
                { key: 'sla_threshold_hours', value: String(slaThreshold), description: 'الحد الحرج للتذاكر بالساعات' }
            );

            const { error: err2 } = await (supabase.from('system_config') as any).upsert(
                { key: 'low_stock_threshold', value: String(lowStockThreshold), description: 'حد تنبيه انخفاض المخزون' }
            );

            if (err1 || err2) throw new Error(err1?.message || err2?.message);
            toast.success('تم تحديث التكوين السيادي بنجاح');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(`فشل في حفظ الإعدادات: ${message}`);
        } finally {
            setSavingSettings(false);
        }
    };

    const tabs = [
        { key: 'brands' as const, label: 'العلامات', icon: Layers },
        { key: 'units' as const, label: 'الفئات', icon: Box },
        { key: 'settings' as const, label: 'الإعدادات', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-12 font-sans rtl" dir="rtl">
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(37,99,235,0.07),_transparent_50%)] pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto space-y-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-blue-400 font-black uppercase tracking-[0.3em] text-xs">
                            <Shield className="w-4 h-4" />
                            Core Administration
                        </div>
                        <h1 className="text-6xl font-black tracking-tighter text-white">
                            إعدادات <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">السيادة</span>
                        </h1>
                    </div>
                </header>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Navigation Sidebar */}
                    <aside className="w-full lg:w-72 space-y-3">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`w-full flex items-center justify-between p-5 rounded-[2rem] transition-all border ${activeTab === tab.key
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-[0_20px_40px_rgba(37,99,235,0.2)]'
                                    : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <tab.icon className={`w-5 h-5 ${activeTab === tab.key ? 'text-white' : 'text-blue-400'}`} />
                                    <span className="font-black text-sm tracking-tight">{tab.label}</span>
                                </div>
                                {activeTab === tab.key && <ArrowRight className="w-4 h-4" />}
                            </button>
                        ))}
                    </aside>

                    {/* Main Content Area */}
                    <main className="flex-1 bg-white/5 backdrop-blur-3xl rounded-[3.5rem] border border-white/10 p-10 shadow-2xl overflow-hidden relative min-h-[600px]">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/5 blur-[80px] pointer-events-none rounded-full" />

                        {activeTab === 'brands' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-black/20 p-6 rounded-[2.5rem] border border-white/5">
                                    <form onSubmit={handleAddBrand} className="flex-1 flex gap-4 w-full">
                                        <input
                                            value={newBrandName}
                                            onChange={e => setNewBrandName(e.target.value)}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:border-blue-500 outline-none transition-all"
                                            placeholder="اسم العلامة التجارية الجديدة..."
                                        />
                                        <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black transition-all flex items-center gap-2 shadow-xl shadow-blue-600/20">
                                            <Plus className="w-5 h-5" /> إضافة
                                        </button>
                                    </form>
                                    <button
                                        onClick={() => setShowArchived(!showArchived)}
                                        className={`p-4 rounded-2xl border transition-all ${showArchived ? 'bg-amber-500 border-amber-400' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/40'}`}
                                        title={showArchived ? 'عرض النشط' : 'عرض الأرشيف'}
                                    >
                                        {showArchived ? <ArchiveRestore className="w-5 h-5 text-white" /> : <Archive className="w-5 h-5" />}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {loadingBrands ? (
                                        <div className="col-span-full py-20 flex flex-col items-center gap-4 text-white/20">
                                            <Loader2 className="w-10 h-10 animate-spin" />
                                            <span className="font-black uppercase tracking-widest text-[10px]">Synchronizing...</span>
                                        </div>
                                    ) : brands.map(brand => (
                                        <div key={brand.id} className="group flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-white/20 transition-all hover:bg-white/[0.08]">
                                            <div className="flex items-center gap-4">
                                                <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all" />
                                                <span className="font-black text-lg tracking-tight">{brand.name_ar}</span>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {showArchived ? (
                                                    <button onClick={() => handleRestoreBrand(brand.id)} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all">
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleArchiveBrand(brand.id, brand.name_ar)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'units' && (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <form onSubmit={handleAddUnit} className="flex gap-4 p-6 bg-black/20 rounded-[2.5rem] border border-white/5">
                                    <input
                                        value={newUnitName}
                                        onChange={e => setNewUnitName(e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:border-blue-500 outline-none transition-all"
                                        placeholder="اسم الفئة الجديدة..."
                                    />
                                    <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black transition-all flex items-center gap-2 shadow-xl shadow-indigo-600/20">
                                        <Plus className="w-5 h-5" /> إضافة
                                    </button>
                                </form>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {units.map(unit => (
                                        <div key={unit.id} className="group flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-white/20 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                <span className="font-black text-lg tracking-tight">{unit.name_ar}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="space-y-10 animate-in fade-in duration-500 max-w-2xl">
                                <div className="space-y-8">
                                    <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 space-y-6">
                                        <div className="flex items-center justify-between gap-6">
                                            <div className="space-y-1">
                                                <h4 className="font-black text-xl tracking-tight text-white">الحد الحرج للتذاكر</h4>
                                                <p className="text-white/20 text-xs font-bold leading-relaxed">تحويل التذكرة تلقائياً إلى "عاجل" إذا لم يتم البدء بها خلال المدة المحددة.</p>
                                            </div>
                                            <div className="flex items-center gap-3 bg-black/40 p-4 rounded-2xl border border-white/5">
                                                <input
                                                    type="number"
                                                    value={slaThreshold}
                                                    onChange={e => setSlaThreshold(Number(e.target.value))}
                                                    className="w-16 bg-transparent text-center font-black text-xl text-blue-400 outline-none"
                                                />
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">HRS</span>
                                            </div>
                                        </div>

                                        <div className="h-px bg-white/5 w-full" />

                                        <div className="flex items-center justify-between gap-6">
                                            <div className="space-y-1">
                                                <h4 className="font-black text-xl tracking-tight text-white">تنبيه انخفاض المخزون</h4>
                                                <p className="text-white/20 text-xs font-bold leading-relaxed">إرسال إشعار للنظام والرقابة عندما تقل الكمية المتوفرة عن هذا الحد.</p>
                                            </div>
                                            <div className="flex items-center gap-3 bg-black/40 p-4 rounded-2xl border border-white/5">
                                                <input
                                                    type="number"
                                                    value={lowStockThreshold}
                                                    onChange={e => setLowStockThreshold(Number(e.target.value))}
                                                    className="w-16 bg-transparent text-center font-black text-xl text-indigo-400 outline-none"
                                                />
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">QTY</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        onClick={handleSaveSettings}
                                        disabled={savingSettings}
                                        className="bg-white text-slate-900 px-12 py-5 rounded-[2rem] font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)] flex items-center gap-3 disabled:opacity-50"
                                    >
                                        {savingSettings ? <Loader2 className="w-6 h-6 animate-spin" /> : <Settings className="w-6 h-6" />}
                                        حفظ التعديلات
                                    </button>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default MasterDataManager;
