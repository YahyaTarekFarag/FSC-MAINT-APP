import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Building2,
    AlertTriangle,
    Info,
    Upload,
    X,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadTicketImage } from '../../lib/storage';
import DynamicForm from '../../components/tickets/DynamicForm';
import type { Database } from '../../lib/supabase';

type Branch = Database['public']['Tables']['branches']['Row'];

const NewTicket: React.FC = () => {
    const navigate = useNavigate();
    const [branches, setBranches] = useState<Pick<Branch, 'id' | 'name_ar'>[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchingBranches, setFetchingBranches] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [form, setForm] = useState({
        branch_id: '',
        fault_category: '', // Stores the name for legacy support
        priority: 'medium',
        description: ''
    });

    const [categories, setCategories] = useState<{ id: string, name_ar: string }[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [dynamicData, setDynamicData] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchBranches();
        fetchCategories();
    }, []);

    const fetchBranches = async () => {
        try {
            const { data, error } = await supabase
                .from('branches')
                .select('id, name_ar')
                .eq('status', 'active')
                .order('name_ar');
            if (error) throw error;
            setBranches(data || []);
        } catch (err) {
            console.error('Error fetching branches:', err);
        } finally {
            setFetchingBranches(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('fault_categories')
                .select('id, name_ar')
                .eq('is_active', true)
                .order('name_ar');

            if (error) throw error;
            setCategories(data || []);
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const removeFile = () => {
        setFile(null);
        setPreviewUrl(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.branch_id || !form.fault_category) return;

        setLoading(true);
        try {
            const imageUrls: string[] = [];
            if (file) {
                const url = await uploadTicketImage(file);
                imageUrls.push(url);
            }

            const { error } = await (supabase.from('tickets') as any).insert({
                branch_id: form.branch_id,
                fault_category: form.fault_category,
                priority: form.priority,
                description: form.description,
                images_url: imageUrls,
                status: 'open',
                form_data: dynamicData
            });

            if (error) throw error;

            navigate('/dashboard');
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Submission error:', error);
            alert(`خطأ: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const priorities = [
        { value: 'low', label: 'عادي', color: 'slate' },
        { value: 'medium', label: 'متوسط', color: 'blue' },
        { value: 'high', label: 'عاجل', color: 'orange' },
        { value: 'urgent', label: 'طارئ جداً', color: 'red' }
    ];

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-amber-100 p-3 rounded-2xl">
                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">إبلاغ عن عطل جديد</h1>
                    <p className="text-slate-500">يرجى ملء البيانات التالية بدقة لضمان سرعة الاستجابة</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Branch Selection */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <label className="flex items-center gap-2 font-bold text-slate-700">
                        <Building2 className="w-5 h-5 text-blue-500" />
                        اختيار الفرع
                    </label>
                    <select
                        required
                        value={form.branch_id}
                        onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                        disabled={fetchingBranches}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50"
                    >
                        <option value="">اختر الفرع...</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name_ar}</option>
                        ))}
                    </select>
                </div>

                {/* Category & Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <label className="flex items-center gap-2 font-bold text-slate-700">
                            <Info className="w-5 h-5 text-blue-500" />
                            تصنيف العطل
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {categories.length === 0 ? (
                                <div className="col-span-2 text-center py-4 text-slate-400">
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                    جاري تحميل التصنيفات...
                                </div>
                            ) : categories.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                        setForm({ ...form, fault_category: cat.name_ar });
                                        setSelectedCategoryId(cat.id);
                                    }}
                                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border break-words
                                        ${selectedCategoryId === cat.id
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'}
                                    `}
                                >
                                    {cat.name_ar}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <label className="flex items-center gap-2 font-bold text-slate-700">
                            <AlertTriangle className="w-5 h-5 text-blue-500" />
                            درجة الأولوية
                        </label>
                        <div className="space-y-2">
                            {priorities.map(p => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setForm({ ...form, priority: p.value })}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all
                                        ${form.priority === p.value
                                            ? `bg-${p.color}-50 border-${p.color}-500 text-${p.color}-700 ring-1 ring-${p.color}-500`
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}
                                    `}
                                >
                                    <span className="font-bold">{p.label}</span>
                                    {form.priority === p.value && <CheckCircle2 className="w-5 h-5" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <label className="font-bold text-slate-700">وصف المشكلة بالتفصيل</label>
                    <textarea
                        required
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-h-[120px]"
                        placeholder="اشرح العطل بوضوح لمساعدة الفني..."
                    />
                </div>

                {/* Dynamic Form Questions */}
                {selectedCategoryId && (
                    <DynamicForm
                        categoryId={selectedCategoryId}
                        onChange={setDynamicData}
                    />
                )}

                {/* Image Upload */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <label className="font-bold text-slate-700 underline decoration-blue-100 underline-offset-4">إرفاق صورة للعطل (اختياري)</label>

                    {!previewUrl ? (
                        <div className="relative group cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 opacity-0 z-10 cursor-pointer"
                            />
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 group-hover:border-blue-400 group-hover:bg-blue-50/50 transition-all">
                                <div className="bg-slate-100 p-4 rounded-full group-hover:bg-blue-100 group-hover:scale-110 transition-all">
                                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-600" />
                                </div>
                                <p className="text-slate-500 font-medium">اضغط هنا أو قم بسحب الصورة</p>
                                <p className="text-xs text-slate-400">PNG, JPG حتى 5 ميجابايت</p>
                            </div>
                        </div>
                    ) : (
                        <div className="relative rounded-2xl overflow-hidden group">
                            <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={removeFile}
                                    className="bg-red-500 p-2 rounded-full text-white hover:scale-110 transition-transform"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-4 flex gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-200 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-3 text-lg"
                    >
                        {loading && <Loader2 className="w-6 h-6 animate-spin" />}
                        إرسال البلاغ
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="px-8 bg-white text-slate-500 border border-slate-200 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewTicket;
