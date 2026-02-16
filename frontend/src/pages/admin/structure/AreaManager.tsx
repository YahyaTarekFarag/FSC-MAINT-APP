import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, Save, X } from 'lucide-react';

type Area = {
    id: string;
    name_ar: string;
    sector_id: string;
    sector?: { name_ar: string };
};

type Sector = {
    id: string;
    name_ar: string;
};

const AreaManager = () => {
    const [areas, setAreas] = useState<Area[]>([]);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingArea, setEditingArea] = useState<Area | null>(null);
    const [formData, setFormData] = useState({ name_ar: '', sector_id: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [areasRes, sectorsRes] = await Promise.all([
                supabase.from('areas').select('*, sector:sectors(name_ar)').order('name_ar'),
                supabase.from('sectors').select('id, name_ar').order('name_ar')
            ]);

            if (areasRes.error) throw areasRes.error;
            if (sectorsRes.error) throw sectorsRes.error;

            setAreas(areasRes.data || []);
            setSectors(sectorsRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingArea) {
                const { error } = await supabase
                    .from('areas')
                    .update({
                        name_ar: formData.name_ar,
                        sector_id: formData.sector_id
                    })
                    .eq('id', editingArea.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('areas')
                    .insert([{
                        name_ar: formData.name_ar,
                        sector_id: formData.sector_id
                    }]);
                if (error) throw error;
            }
            await fetchData(); // Refresh to get updated relations
            handleCloseModal();
        } catch (error) {
            console.error('Error saving area:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`هل أنت متأكد من حذف منطقة "${name}"؟`)) return;

        try {
            // Check for children (branches)
            const { count, error: countError } = await supabase
                .from('branches')
                .select('*', { count: 'exact', head: true })
                .eq('area_id', id);

            if (countError) throw countError;

            if (count && count > 0) {
                alert(`لا يمكن حذف هذه المنطقة لأنها تحتوي على ${count} فروع مرتبطة بها.`);
                return;
            }

            const { error } = await supabase
                .from('areas')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setAreas(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error('Error deleting area:', error);
            alert('حدث خطأ أثناء الحذف');
        }
    };

    const handleOpenModal = (area?: Area) => {
        if (area) {
            setEditingArea(area);
            setFormData({ name_ar: area.name_ar, sector_id: area.sector_id });
        } else {
            setEditingArea(null);
            setFormData({ name_ar: '', sector_id: sectors[0]?.id || '' });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingArea(null);
        setFormData({ name_ar: '', sector_id: '' });
    };

    if (loading) return <div className="p-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">قائمة المناطق</h2>
                    <p className="text-slate-500 text-sm">التوزيع الجغرافي داخل القطاعات</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    disabled={sectors.length === 0}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    <Plus className="w-4 h-4" />
                    إضافة منطقة
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-700 font-bold text-sm">
                        <tr>
                            <th className="p-4 rounded-r-xl">اسم المنطقة</th>
                            <th className="p-4">القطاع التابع</th>
                            <th className="p-4 rounded-l-xl w-32">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {areas.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-slate-400 font-bold">
                                    لا توجد مناطق مضافة
                                </td>
                            </tr>
                        ) : (
                            areas.map(area => (
                                <tr key={area.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-800">{area.name_ar}</td>
                                    <td className="p-4 text-slate-600">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">
                                            {area.sector?.name_ar || 'غير محدد'}
                                        </span>
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(area)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(area.id, area.name_ar)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-900">
                                {editingArea ? 'تعديل منطقة' : 'إضافة منطقة جديدة'}
                            </h3>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">اسم المنطقة (عربي)</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name_ar}
                                    onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                    placeholder="مثال: مدينة نصر"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">القطاع</label>
                                <select
                                    required
                                    value={formData.sector_id}
                                    onChange={e => setFormData({ ...formData, sector_id: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-white"
                                >
                                    <option value="" disabled>اختر القطاع...</option>
                                    {sectors.map(sector => (
                                        <option key={sector.id} value={sector.id}>{sector.name_ar}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    حفظ البيانات
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AreaManager;
