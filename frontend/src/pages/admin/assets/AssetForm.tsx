
import { useState, useEffect } from 'react';
import { X, Save, Loader2, Box } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';

type Asset = {
    id: string;
    branch_id: string;
    name: string;
    category_id: string | null;
    serial_number: string | null;
    model_number: string | null;
    purchase_date: string | null;
    warranty_expiry: string | null;
    status: 'active' | 'maintenance' | 'retired' | 'disposed';
    notes: string | null;
};

type Props = {
    asset: Asset | null;
    onClose: () => void;
    onSuccess: () => void;
};

const AssetForm = ({ asset, onClose, onSuccess }: Props) => {
    const [branches, setBranches] = useState<{ id: string, name_ar: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        branch_id: '',
        serial_number: '',
        model_number: '',
        purchase_date: '',
        warranty_expiry: '',
        status: 'active',
        notes: ''
    });

    useEffect(() => {
        fetchBranches();
        if (asset) {
            setFormData({
                name: asset.name,
                branch_id: asset.branch_id,
                serial_number: asset.serial_number || '',
                model_number: asset.model_number || '',
                purchase_date: asset.purchase_date || '',
                warranty_expiry: asset.warranty_expiry || '',
                status: asset.status,
                notes: asset.notes || ''
            });
        }
    }, [asset]);

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, name_ar').order('name_ar');
        setBranches(data || []);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                serial_number: formData.serial_number || null,
                model_number: formData.model_number || null,
                purchase_date: formData.purchase_date || null,
                warranty_expiry: formData.warranty_expiry || null,
                notes: formData.notes || null
            };

            if (asset) {
                const { error } = await supabase.from('assets').update(payload as any).eq('id', asset.id);
                if (error) throw error;
                toast.success('تم تحديث الأصل بنجاح');
            } else {
                const { error } = await supabase.from('assets').insert(payload as any);
                if (error) throw error;
                toast.success('تمت إضافة الأصل بنجاح');
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving asset:', error);
            toast.error('حدث خطأ أثناء الحفظ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Box className="w-6 h-6 text-blue-600" />
                        {asset ? 'تعديل بيانات الأصل' : 'إضافة أصل جديد'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-1">اسم الأصل *</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                                placeholder="مثال: تكييف غرفة السيرفر"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الفرع *</label>
                            <select
                                required
                                value={formData.branch_id}
                                onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white"
                            >
                                <option value="">اختر الفرع</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name_ar}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الحالة</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white"
                            >
                                <option value="active">نشط (Active)</option>
                                <option value="maintenance">في الصيانة (In Maintenance)</option>
                                <option value="retired">متقاعد (Retired)</option>
                                <option value="disposed">تالف/تم التخلص منه (Disposed)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الرقم التسلسلي</label>
                            <input
                                type="text"
                                value={formData.serial_number}
                                onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">رقم الموديل</label>
                            <input
                                type="text"
                                value={formData.model_number}
                                onChange={e => setFormData({ ...formData, model_number: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">تاريخ الشراء</label>
                            <input
                                type="date"
                                value={formData.purchase_date}
                                onChange={e => setFormData({ ...formData, purchase_date: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">انتهاء الضمان</label>
                            <input
                                type="date"
                                value={formData.warranty_expiry}
                                onChange={e => setFormData({ ...formData, warranty_expiry: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات</label>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 h-20 resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>جاري الحفظ...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    <span>حفظ</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AssetForm;
