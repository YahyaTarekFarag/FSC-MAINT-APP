import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, Save, X, AlertTriangle } from 'lucide-react';

type Sector = {
    id: string;
    name_ar: string;
    created_at: string;
};

const SectorManager = () => {
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSector, setEditingSector] = useState<Sector | null>(null);
    const [formData, setFormData] = useState({ name_ar: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSectors();
    }, []);

    const fetchSectors = async () => {
        try {
            const { data, error } = await supabase
                .from('sectors')
                .select('*')
                .order('name_ar');

            if (error) throw error;
            setSectors(data || []);
        } catch (error) {
            console.error('Error fetching sectors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingSector) {
                const { error } = await supabase
                    .from('sectors')
                    .update({ name_ar: formData.name_ar })
                    .eq('id', editingSector.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('sectors')
                    .insert([{ name_ar: formData.name_ar }]);
                if (error) throw error;
            }
            await fetchSectors();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving sector:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`هل أنت متأكد من حذف قطاع "${name}"؟`)) return;

        try {
            // Check for children
            const { count, error: countError } = await supabase
                .from('areas')
                .select('*', { count: 'exact', head: true })
                .eq('sector_id', id);

            if (countError) throw countError;

            if (count && count > 0) {
                alert(`لا يمكن حذف هذا القطاع لأنه يحتوي على ${count} مناطق مرتبطة به.`);
                return;
            }

            const { error } = await supabase
                .from('sectors')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setSectors(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error('Error deleting sector:', error);
            alert('حدث خطأ أثناء الحذف');
        }
    };

    const handleOpenModal = (sector?: Sector) => {
        if (sector) {
            setEditingSector(sector);
            setFormData({ name_ar: sector.name_ar });
        } else {
            setEditingSector(null);
            setFormData({ name_ar: '' });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingSector(null);
        setFormData({ name_ar: '' });
    };

    if (loading) return <div className="p-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">قائمة القطاعات</h2>
                    <p className="text-slate-500 text-sm">التقسيم الإداري الأعلى للمناطق</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    إضافة قطاع
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-700 font-bold text-sm">
                        <tr>
                            <th className="p-4 rounded-r-xl">اسم القطاع</th>
                            <th className="p-4 rounded-l-xl w-32">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sectors.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="p-8 text-center text-slate-400 font-bold">
                                    لا توجد قطاعات مضافة
                                </td>
                            </tr>
                        ) : (
                            sectors.map(sector => (
                                <tr key={sector.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-800">{sector.name_ar}</td>
                                    <td className="p-4 flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(sector)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(sector.id, sector.name_ar)}
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
                                {editingSector ? 'تعديل قطاع' : 'إضافة قطاع جديد'}
                            </h3>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">اسم القطاع (عربي)</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name_ar}
                                    onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                    placeholder="مثال: قطاع القاهرة الكبرى"
                                />
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

export default SectorManager;
