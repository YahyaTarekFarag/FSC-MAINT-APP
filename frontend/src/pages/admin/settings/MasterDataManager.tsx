import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Database, Plus, Trash2, Edit2, Save, X, Settings, Layers, Box
} from 'lucide-react';

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
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

    // Unit Form
    const [units, setUnits] = useState<{ id: number; name_ar: string }[]>([]);
    const [newUnitName, setNewUnitName] = useState('');

    useEffect(() => {
        if (activeTab === 'brands') fetchBrands();
        if (activeTab === 'units') fetchUnits();
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

    const handleAddBrand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBrandName.trim()) return;

        try {
            const { error } = await supabase.from('brands').insert([{ name_ar: newBrandName }]);
            if (error) throw error;
            setNewBrandName('');
            fetchBrands();
        } catch (error) {
            console.error('Error adding brand:', error);
            alert('فشل إضافة العلامة التجارية');
        }
    };

    const handleDeleteBrand = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه العلامة التجارية؟')) return;
        try {
            const { error } = await supabase.from('brands').delete().eq('id', id);
            if (error) throw error;
            fetchBrands();
        } catch (error) {
            console.error('Error deleting brand:', error);
            alert('فشل الحذف');
        }
    };

    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUnitName.trim()) return;

        try {
            const { error } = await supabase.from('unit_types').insert([{ name_ar: newUnitName }]);
            if (error) throw error;
            setNewUnitName('');
            fetchUnits();
        } catch (error) {
            console.error('Error adding unit:', error);
            alert('فشل إضافة الوحدة');
        }
    };

    const handleDeleteUnit = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذه الوحدة؟')) return;
        try {
            const { error } = await supabase.from('unit_types').delete().eq('id', id);
            if (error) throw error;
            fetchUnits();
        } catch (error) {
            console.error('Error deleting unit:', error);
            alert('فشل الحذف');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-8 font-sans" dir="rtl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">إدارة البيانات الأساسية</h1>
                <p className="text-slate-500 text-sm">التحكم في جداول البحث وإعدادات النظام</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-4 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('brands')}
                    className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'brands' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    العلامات التجارية
                </button>
                <button
                    onClick={() => setActiveTab('units')}
                    className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'units' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Box className="w-4 h-4" />
                    وحدات القياس
                </button>
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <Settings className="w-4 h-4" />
                    إعدادات النظام
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[400px]">

                {/* Brands Manager */}
                {activeTab === 'brands' && (
                    <div className="max-w-2xl">
                        <form onSubmit={handleAddBrand} className="flex gap-3 mb-6">
                            <input
                                type="text"
                                placeholder="اسم العلامة التجارية الجديدة..."
                                value={newBrandName}
                                onChange={e => setNewBrandName(e.target.value)}
                                className="flex-1 p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                            />
                            <button
                                type="submit"
                                className="bg-blue-600 text-white px-6 rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                إضافة
                            </button>
                        </form>

                        <div className="space-y-2">
                            {brands.map(brand => (
                                <div key={brand.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group">
                                    <span className="font-bold text-slate-800">{brand.name_ar}</span>
                                    <button
                                        onClick={() => handleDeleteBrand(brand.id)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {brands.length === 0 && !loading && (
                                <div className="text-center p-8 text-slate-400">لا توجد علامات تجارية مضافة</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Units Manager */}
                {activeTab === 'units' && (
                    <div className="max-w-2xl">
                        <form onSubmit={handleAddUnit} className="flex gap-3 mb-6">
                            <input
                                type="text"
                                placeholder="اسم وحدة القياس الجديدة..."
                                value={newUnitName}
                                onChange={e => setNewUnitName(e.target.value)}
                                className="flex-1 p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                            />
                            <button
                                type="submit"
                                className="bg-purple-600 text-white px-6 rounded-xl font-bold hover:bg-purple-700 flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                إضافة
                            </button>
                        </form>

                        <div className="space-y-2">
                            {units.map(unit => (
                                <div key={unit.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group">
                                    <span className="font-bold text-slate-800">{unit.name_ar}</span>
                                    <button
                                        onClick={() => handleDeleteUnit(unit.id)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {units.length === 0 && !loading && (
                                <div className="text-center p-8 text-slate-400">لا توجد وحدات قياس مضافة</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Settings (Mock) */}
                {activeTab === 'settings' && (
                    <div className="space-y-6 max-w-2xl">
                        <h3 className="font-bold text-lg text-slate-800 border-b border-slate-100 pb-2">منطق الأولويات</h3>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div>
                                <div className="font-bold text-slate-900">الحد الحرج للتذاكر</div>
                                <div className="text-sm text-slate-500">تحويل التذكرة تلقائياً إلى "عاجل" إذا لم يتم البدء بها خلال</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="number" defaultValue={24} className="w-20 p-2 text-center rounded-lg border border-slate-200" />
                                <span className="text-sm font-bold text-slate-600">ساعة</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div>
                                <div className="font-bold text-slate-900">تنبيه انخفاض المخزون</div>
                                <div className="text-sm text-slate-500">إرسال إشعار عندما تقل الكمية عن</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="number" defaultValue={5} className="w-20 p-2 text-center rounded-lg border border-slate-200" />
                                <span className="text-sm font-bold text-slate-600">وحدة</span>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800">
                                حفظ الإعدادات
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MasterDataManager;
