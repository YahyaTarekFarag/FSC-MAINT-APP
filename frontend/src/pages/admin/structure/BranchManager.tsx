import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, Save, X, MapPin } from 'lucide-react';

type Branch = {
    id: string;
    name_ar: string;
    area_id: string;
    location_lat: number | null;
    location_lng: number | null;
    area?: { name_ar: string };
};

type Area = {
    id: string;
    name_ar: string;
};

const BranchManager = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [formData, setFormData] = useState({
        name_ar: '',
        area_id: '',
        location_lat: '',
        location_lng: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [branchesRes, areasRes] = await Promise.all([
                supabase.from('branches').select('*, area:areas(name_ar)').order('name_ar'),
                supabase.from('areas').select('id, name_ar').order('name_ar')
            ]);

            if (branchesRes.error) throw branchesRes.error;
            if (areasRes.error) throw areasRes.error;

            setBranches(branchesRes.data || []);
            setAreas(areasRes.data || []);
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
            const payload = {
                name_ar: formData.name_ar,
                area_id: formData.area_id,
                location_lat: formData.location_lat ? parseFloat(formData.location_lat) : null,
                location_lng: formData.location_lng ? parseFloat(formData.location_lng) : null
            };

            if (editingBranch) {
                const { error } = await supabase
                    .from('branches')
                    .update(payload)
                    .eq('id', editingBranch.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('branches')
                    .insert([payload]);
                if (error) throw error;
            }
            await fetchData();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving branch:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`هل أنت متأكد من حذف فرع "${name}"؟`)) return;

        try {
            const { error } = await supabase
                .from('branches')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setBranches(prev => prev.filter(b => b.id !== id));
        } catch (error) {
            console.error('Error deleting branch:', error);
            alert('حدث خطأ أثناء الحذف');
        }
    };

    const handleOpenModal = (branch?: Branch) => {
        if (branch) {
            setEditingBranch(branch);
            setFormData({
                name_ar: branch.name_ar,
                area_id: branch.area_id,
                location_lat: branch.location_lat?.toString() || '',
                location_lng: branch.location_lng?.toString() || ''
            });
        } else {
            setEditingBranch(null);
            setFormData({
                name_ar: '',
                area_id: areas[0]?.id || '',
                location_lat: '',
                location_lng: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingBranch(null);
        setFormData({ name_ar: '', area_id: '', location_lat: '', location_lng: '' });
    };

    if (loading) return <div className="p-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">قائمة الفروع</h2>
                    <p className="text-slate-500 text-sm">إدارة الفروع وتحديد مواقعها الجغرافية</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    disabled={areas.length === 0}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    <Plus className="w-4 h-4" />
                    إضافة فرع
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-700 font-bold text-sm">
                        <tr>
                            <th className="p-4 rounded-r-xl">اسم الفرع</th>
                            <th className="p-4">المنطقة</th>
                            <th className="p-4">الموقع</th>
                            <th className="p-4 rounded-l-xl w-32">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {branches.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-400 font-bold">
                                    لا توجد فروع مضافة
                                </td>
                            </tr>
                        ) : (
                            branches.map(branch => (
                                <tr key={branch.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-800">{branch.name_ar}</td>
                                    <td className="p-4 text-slate-600">
                                        <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">
                                            {branch.area?.name_ar || 'غير محدد'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {branch.location_lat && branch.location_lng ? (
                                            <a
                                                href={`https://www.google.com/maps?q=${branch.location_lat},${branch.location_lng}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-bold"
                                            >
                                                <MapPin className="w-3 h-3" />
                                                عرض الخريطة
                                            </a>
                                        ) : (
                                            <span className="text-slate-300 text-xs">غير محدد</span>
                                        )}
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(branch)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(branch.id, branch.name_ar)}
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
                                {editingBranch ? 'تعديل فرع' : 'إضافة فرع جديد'}
                            </h3>
                            <button onClick={handleCloseModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">اسم الفرع (عربي)</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name_ar}
                                    onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                    placeholder="مثال: فرع التجمع الخامس"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">المنطقة</label>
                                <select
                                    required
                                    value={formData.area_id}
                                    onChange={e => setFormData({ ...formData, area_id: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all bg-white"
                                >
                                    <option value="" disabled>اختر المنطقة...</option>
                                    {areas.map(area => (
                                        <option key={area.id} value={area.id}>{area.name_ar}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">خط العرض (Lat)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.location_lat}
                                        onChange={e => setFormData({ ...formData, location_lat: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-left"
                                        placeholder="30.0444"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">خط الطول (Lng)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.location_lng}
                                        onChange={e => setFormData({ ...formData, location_lng: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-left"
                                        placeholder="31.2357"
                                    />
                                </div>
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

export default BranchManager;
