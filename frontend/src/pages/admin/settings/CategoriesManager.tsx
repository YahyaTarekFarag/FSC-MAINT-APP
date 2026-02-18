import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Save, Edit2, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface DiagnosticQuestion {
    id: string;
    text: string;
    type: 'boolean' | 'text' | 'select';
    options?: string[]; // For select type
}

interface Category {
    id: string;
    name_ar: string;
    name_en: string; // Keeping for schema compatibility, though UI is AR focused
    is_active: boolean;
    questions?: DiagnosticQuestion[];
    compatible_part_types?: string[];
}

export default function CategoriesManager() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Category>>({});


    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('fault_categories')
                .select('*')
                .order('name_ar');

            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error(error);
            toast.error('فشل تحميل التصنيفات');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (cat: Category) => {
        setSelectedCategory(cat);
        setFormData({ name_ar: cat.name_ar, is_active: cat.is_active });
        setIsEditing(true);
    };

    const handleCreate = () => {
        setSelectedCategory(null);
        setFormData({ name_ar: '', is_active: true });
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!formData.name_ar) {
            toast.error('اسم التصنيف مطلوب');
            return;
        }

        try {
            const payload = {
                name_ar: formData.name_ar,
                name_en: formData.name_ar, // Auto-fill EN for now
                is_active: formData.is_active
            };

            let error;
            if (selectedCategory) {
                const { error: updateError } = await (supabase
                    .from('fault_categories') as any)
                    .update(payload)
                    .eq('id', selectedCategory.id);
                error = updateError;
            } else {
                const { error: insertError } = await (supabase
                    .from('fault_categories') as any)
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            toast.success('تم الحفظ بنجاح');
            setIsEditing(false);
            fetchCategories();
        } catch (error: any) {
            toast.error('خطأ في الحفظ: ' + error.message);
        }
    };



    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Available Categories List */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-800">التصنيفات</h2>
                        <button
                            onClick={handleCreate}
                            className="p-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-slate-400">جاري التحميل...</div>
                    ) : (
                        <div className="space-y-3">
                            {categories.map(cat => (
                                <div
                                    key={cat.id}
                                    onClick={() => handleEdit(cat)}
                                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${selectedCategory?.id === cat.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-800">{cat.name_ar}</span>
                                        <div className={`w-2 h-2 rounded-full ${cat.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 font-bold">
                                        {cat.questions?.length || 0} سؤال تشخيصي
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Editor Area */}
                <div className="lg:col-span-2">
                    {isEditing ? (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-900">
                                    {selectedCategory ? 'تعديل التصنيف' : 'تصنيف جديد'}
                                </h3>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Basic Info */}
                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">اسم التصنيف (ثلاجة، تكييف...)</label>
                                    <input
                                        type="text"
                                        value={formData.name_ar || ''}
                                        onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="مثال: معدات القهوة"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active || false}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label className="text-sm font-bold text-slate-700">مفعل</label>
                                </div>
                            </div>

                            {/* Diagnostic Questions Link */}
                            <div className="border-t border-slate-100 pt-6">
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-1">
                                            <AlertCircle className="w-5 h-5 text-blue-600" />
                                            أسئلة التشخيص
                                        </h4>
                                        <p className="text-sm text-blue-700 font-medium">
                                            تم نقل إدارة الأسئلة إلى "منشئ النماذج" في إعدادات النظام
                                        </p>
                                    </div>
                                    <a
                                        href="/admin/settings/system"
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                                    >
                                        الذهاب للمنشئ
                                    </a>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-8 pt-6 border-t border-slate-100">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-5 h-5" />
                                    حفظ التصنيف
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black hover:bg-slate-200 transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 min-h-[400px]">
                            <Edit2 className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-bold">اختر تصنيفاً للتعديل أو أنشئ جديداً</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
