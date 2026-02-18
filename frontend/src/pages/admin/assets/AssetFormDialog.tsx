import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { X, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Database } from '../../../lib/supabase';

type Asset = Database['public']['Tables']['maintenance_assets']['Row'];
type AssetInsert = Database['public']['Tables']['maintenance_assets']['Insert'];
type AssetUpdate = Database['public']['Tables']['maintenance_assets']['Update'];

// Extend Helper until types are regenerated
type AssetInsertExtended = AssetInsert & { category_id?: string | null };

interface AssetFormDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    assetToEdit?: Asset | null;
}

export const AssetFormDialog = ({ isOpen, onClose, onSuccess, assetToEdit }: AssetFormDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<{ id: string; name_ar: string }[]>([]);
    const [brands, setBrands] = useState<{ id: string; name_ar: string }[]>([]);
    const [categories, setCategories] = useState<{ id: string; name_ar: string }[]>([]);
    const [jsonString, setJsonString] = useState('{}');
    const [jsonError, setJsonError] = useState(false);

    const [formData, setFormData] = useState<AssetInsertExtended>({
        name: '',
        branch_id: '',
        brand_id: null,
        category_id: null, // Add category_id
        serial_number: '',
        status: 'Active',
        notes: '',
        model_number: '',
        location_details: '',
        technical_specs: {}
    });

    useEffect(() => {
        if (isOpen) {
            fetchOptions();
            if (assetToEdit) {
                const specs = assetToEdit.technical_specs || {};
                setFormData({
                    name: assetToEdit.name,
                    branch_id: assetToEdit.branch_id,
                    brand_id: assetToEdit.brand_id,
                    category_id: assetToEdit.category_id || null,
                    serial_number: assetToEdit.serial_number,
                    status: assetToEdit.status,
                    notes: assetToEdit.notes,
                    model_number: assetToEdit.model_number || '',
                    location_details: assetToEdit.location_details || '',
                    technical_specs: specs
                });
                setJsonString(JSON.stringify(specs, null, 2));
            } else {
                setFormData({
                    name: '',
                    branch_id: '',
                    brand_id: null,
                    category_id: null,
                    serial_number: '',
                    status: 'Active',
                    notes: '',
                    model_number: '',
                    location_details: '',
                    technical_specs: {}
                });
                setJsonString('{}');
            }
            setJsonError(false);
        }
    }, [isOpen, assetToEdit]);

    const fetchOptions = async () => {
        try {
            const [branchesRes, brandsRes, catsRes] = await Promise.all([
                supabase.from('branches').select('id, name_ar').order('name_ar'),
                supabase.from('brands').select('id, name_ar').order('name_ar'),
                supabase.from('fault_categories').select('id, name_ar').eq('is_active', true).order('name_ar')
            ]);

            if (branchesRes.error) throw branchesRes.error;
            if (brandsRes.error) throw brandsRes.error;
            if (catsRes.error) throw catsRes.error;

            setBranches(branchesRes.data || []);
            setBrands(brandsRes.data || []);
            setCategories(catsRes.data || []);
        } catch (error) {
            console.error('Error fetching options:', error);
            toast.error('فشل تحميل البيانات');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let parsedSpecs = {};
            try {
                parsedSpecs = JSON.parse(jsonString);
            } catch (err) {
                toast.error('صيغة المواصفات الفنية غير صحيحة (JSON Error)');
                setJsonError(true);
                setLoading(false);
                return;
            }

            const finalData = {
                ...formData,
                technical_specs: parsedSpecs
            };

            if (!formData.branch_id) {
                toast.error('يرجى اختيار الفرع');
                setLoading(false);
                return;
            }

            if (assetToEdit) {
                const { error } = await supabase
                    .from('maintenance_assets')
                    .update({
                        ...finalData,
                        updated_at: new Date().toISOString()
                    } as any)
                    .eq('id', assetToEdit.id);

                if (error) throw error;
                toast.success('تم تحديث المعدة بنجاح');
            } else {
                const { error } = await supabase
                    .from('maintenance_assets')
                    .insert([finalData] as any);

                if (error) throw error;
                toast.success('تم إضافة المعدة بنجاح');
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving asset:', error);
            toast.error(error.message || 'حدث خطأ أثناء الحفظ');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h2 className="text-xl font-black text-slate-800">
                        {assetToEdit ? 'تعديل بيانات المعدة' : 'إضافة معدة جديدة'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">اسم المعدة</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="مثال: ماكينة آيس كريم 1"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الفرع</label>
                            <select
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                                value={formData.branch_id}
                                onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                            >
                                <option value="">اختر الفرع...</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name_ar}</option>
                                ))}
                            </select>
                        </div>

                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">الماركة</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                            value={formData.brand_id || ''}
                            onChange={e => setFormData({ ...formData, brand_id: e.target.value || null })}
                        >
                            <option value="">اختر الماركة...</option>
                            {brands.map(b => (
                                <option key={b.id} value={b.id}>{b.name_ar}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-1">تصنيف المعدة (للتوافق مع قطع الغيار)</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                            value={formData.category_id || ''}
                            onChange={e => setFormData({ ...formData, category_id: e.target.value || null })}
                        >
                            <option value="">اختر التصنيف...</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name_ar}</option>
                            ))}
                        </select>
                    </div>


                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">الرقم التسلسلي (Serial Number)</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold font-mono text-left"
                            dir="ltr"
                            value={formData.serial_number || ''}
                            onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                            placeholder="SN-123456"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">رقم الموديل</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                                value={formData.model_number || ''}
                                onChange={e => setFormData({ ...formData, model_number: e.target.value })}
                                placeholder="Model-X"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">تفاصيل الموقع</label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                                value={formData.location_details || ''}
                                onChange={e => setFormData({ ...formData, location_details: e.target.value })}
                                placeholder="مثلاً: خلف الكاونتر"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-sm font-bold text-slate-700">المواصفات الفنية (JSON)</label>
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        setJsonString(JSON.stringify(JSON.parse(jsonString), null, 2));
                                        setJsonError(false);
                                    } catch (e) {
                                        toast.error('كود غير صالح');
                                        setJsonError(true);
                                    }
                                }}
                                className="text-[10px] text-blue-600 font-bold hover:underline"
                            >
                                تنسيق الكود (Format)
                            </button>
                        </div>
                        <textarea
                            className={`w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-sm min-h-[100px] transition-colors ${jsonError ? 'border-red-300 ring-red-100' : 'border-slate-200'}`}
                            dir="ltr"
                            value={jsonString}
                            onChange={e => {
                                setJsonString(e.target.value);
                                setJsonError(false);
                            }}
                            placeholder='{ "power": "220V", "weight": "50kg" }'
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">الحالة</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['Active', 'Under Repair', 'Scrapped'].map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, status: status as any })}
                                    className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${formData.status === status
                                        ? status === 'Active'
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : status === 'Under Repair'
                                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                : 'border-red-500 bg-red-50 text-red-700'
                                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                                        }`}
                                >
                                    {status === 'Active' ? 'نشط' : status === 'Under Repair' ? 'تحت الصيانة' : 'خارج الخدمة'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظات</label>
                        <textarea
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold min-h-[80px]"
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="أي تفاصيل إضافية..."
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {assetToEdit ? 'حفظ التغييرات' : 'إضافة الان'}
                        </button>
                    </div>
                </form >
            </div >
        </div >
    );
};
