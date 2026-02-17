import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Plus, Trash2, Settings, Layers, Box, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

type Brand = {
    id: string;
    name_ar: string;
    logo_url?: string;
};

const MasterDataManager = () => {
    const [activeTab, setActiveTab] = useState<'brands' | 'units' | 'settings'>('brands');
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(false);

    // Brand Form
    const [newBrandName, setNewBrandName] = useState('');

    // Unit Form
    const [units, setUnits] = useState<{ id: number; name_ar: string }[]>([]);
    const [newUnitName, setNewUnitName] = useState('');

    // Settings State (controlled inputs)
    const [slaThreshold, setSlaThreshold] = useState(24);
    const [lowStockThreshold, setLowStockThreshold] = useState(5);
    const [savingSettings, setSavingSettings] = useState(false);

    useEffect(() => {
        if (activeTab === 'brands') fetchBrands();
        if (activeTab === 'units') fetchUnits();
        if (activeTab === 'settings') fetchSettings();
    }, [activeTab]);

    const fetchBrands = async () => {
        setLoading(true);
        const { data } = await supabase.from('brands').select('*').order('name_ar');
        setBrands(data || []);
        setLoading(false);
    };

    const fetchUnits = async () => {
        setLoading(true);
        const { data } = await supabase.from('unit_types').select('*').order('name_ar');
        setUnits(data || []);
        setLoading(false);
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('system_config')
                .select('key, value')
                .in('key', ['sla_threshold_hours', 'low_stock_threshold']);

            if (data) {
                for (const item of data) {
                    if (item.key === 'sla_threshold_hours') setSlaThreshold(Number(item.value) || 24);
                    if (item.key === 'low_stock_threshold') setLowStockThreshold(Number(item.value) || 5);
                }
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddBrand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBrandName.trim()) return;
        setLoading(true);
        const { error } = await (supabase.from('brands') as any).insert([{ name_ar: newBrandName.trim() }]);
        if (error) {
            toast.error('فشل إضافة العلامة التجارية');
            console.error(error);
        } else {
            toast.success('تمت الإضافة بنجاح');
            setNewBrandName('');
            fetchBrands();
        }
        setLoading(false);
    };

    const handleDeleteBrand = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه العلامة التجارية؟')) return;
        setLoading(true);
        const { error } = await supabase.from('brands').delete().eq('id', id);
        if (error) {
            toast.error('فشل حذف العلامة التجارية');
            console.error(error);
        } else {
            toast.success('تم الحذف بنجاح');
            fetchBrands();
        }
        setLoading(false);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUnitName.trim()) return;
        setLoading(true);
        const { error } = await (supabase.from('unit_types') as any).insert([{ name_ar: newUnitName.trim() }]);
        if (error) {
            toast.error('فشل إضافة الوحدة');
            console.error(error);
        } else {
            toast.success('تمت الإضافة بنجاح');
            setNewUnitName('');
            fetchUnits();
        }
        setLoading(false);
    };

    const handleDeleteUnit = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذه الوحدة؟')) return;
        setLoading(true);
        const { error } = await supabase.from('unit_types').delete().eq('id', id);
        if (error) {
            toast.error('فشل حذف الوحدة');
            console.error(error);
        } else {
            toast.success('تم الحذف بنجاح');
            fetchUnits();
        }
        setLoading(false);
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: err1 } = await (supabase.from('system_config') as any).upsert(
                { key: 'sla_threshold_hours', value: slaThreshold, description: 'الحد الحرج للتذاكر بالساعات' },
                { onConflict: 'key' }
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: err2 } = await (supabase.from('system_config') as any).upsert(
                { key: 'low_stock_threshold', value: lowStockThreshold, description: 'حد تنبيه انخفاض المخزون' },
                { onConflict: 'key' }
            );

            if (err1 || err2) {
                throw new Error(err1?.message || err2?.message);
            }

            toast.success('تم حفظ إعدادات النظام بنجاح ✅');
        } catch (err) {
            console.error('Settings save error:', err);
            toast.error('فشل في حفظ الإعدادات');
        } finally {
            setSavingSettings(false);
        }
    };

    const tabs = [
        { key: 'brands' as const, label: 'العلامات التجارية', icon: Layers },
        { key: 'units' as const, label: 'أنواع الوحدات', icon: Box },
        { key: 'settings' as const, label: 'إعدادات النظام', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-8" dir="rtl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">إدارة البيانات الأساسية</h1>
                <p className="text-slate-500 text-sm mt-1">إدارة العلامات التجارية، أنواع الوحدات، وإعدادات النظام</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl border border-slate-100 w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === tab.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                {/* Brands Tab */}
                {activeTab === 'brands' && (
                    <div className="space-y-4">
                        <form onSubmit={handleAddBrand} className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="text-sm font-bold text-slate-700 block mb-1">اسم العلامة التجارية</label>
                                <input
                                    value={newBrandName}
                                    onChange={e => setNewBrandName(e.target.value)}
                                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="مثال: سامسونج"
                                />
                            </div>
                            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-500 flex items-center gap-2">
                                <Plus className="w-4 h-4" /> إضافة
                            </button>
                        </form>
                        <div className="divide-y divide-slate-100">
                            {brands.map(brand => (
                                <div key={brand.id} className="flex items-center justify-between py-3 px-2 hover:bg-slate-50 rounded-lg">
                                    <span className="font-bold text-slate-800">{brand.name_ar}</span>
                                    <button onClick={() => handleDeleteBrand(brand.id)} className="text-red-500 hover:text-red-700 p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Units Tab */}
                {activeTab === 'units' && (
                    <div className="space-y-4">
                        <form onSubmit={handleAddUnit} className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="text-sm font-bold text-slate-700 block mb-1">اسم الوحدة</label>
                                <input
                                    value={newUnitName}
                                    onChange={e => setNewUnitName(e.target.value)}
                                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="مثال: ثلاجة عرض"
                                />
                            </div>
                            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-500 flex items-center gap-2">
                                <Plus className="w-4 h-4" /> إضافة
                            </button>
                        </form>
                        <div className="divide-y divide-slate-100">
                            {units.map(unit => (
                                <div key={unit.id} className="flex items-center justify-between py-3 px-2 hover:bg-slate-50 rounded-lg">
                                    <span className="font-bold text-slate-800">{unit.name_ar}</span>
                                    <button onClick={() => handleDeleteUnit(unit.id)} className="text-red-500 hover:text-red-700 p-1">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Settings Tab (Persistent) */}
                {activeTab === 'settings' && (
                    <div className="space-y-6 max-w-2xl">
                        <h3 className="font-bold text-lg text-slate-800 border-b border-slate-100 pb-2">إعدادات النظام</h3>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div>
                                <div className="font-bold text-slate-900">الحد الحرج للتذاكر</div>
                                <div className="text-sm text-slate-500">تحويل التذكرة تلقائياً إلى "عاجل" إذا لم يتم البدء بها خلال</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={slaThreshold}
                                    onChange={e => setSlaThreshold(Number(e.target.value))}
                                    min={1}
                                    className="w-20 p-2 text-center rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <span className="text-sm font-bold text-slate-600">ساعة</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div>
                                <div className="font-bold text-slate-900">تنبيه انخفاض المخزون</div>
                                <div className="text-sm text-slate-500">إرسال إشعار عندما تقل الكمية عن</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={lowStockThreshold}
                                    onChange={e => setLowStockThreshold(Number(e.target.value))}
                                    min={1}
                                    className="w-20 p-2 text-center rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <span className="text-sm font-bold text-slate-600">وحدة</span>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={handleSaveSettings}
                                disabled={savingSettings}
                                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition flex items-center gap-2 disabled:opacity-50"
                            >
                                {savingSettings ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        جاري الحفظ...
                                    </>
                                ) : (
                                    'حفظ الإعدادات'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MasterDataManager;
