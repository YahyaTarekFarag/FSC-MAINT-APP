import { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Save,
    ArrowRight,
    CheckCircle2,
    List,
    Type,
    Camera,
    Hash,
    ToggleLeft,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

// Types
type Category = {
    id: string;
    name_ar: string;
    icon: string;
};

type Question = {
    id: number;
    category_id: string;
    question_text: string;
    field_type: 'text' | 'number' | 'yes_no' | 'photo' | 'select';
    options: string[] | null;
    is_required: boolean;
    order_index: number;
    stage: 'diagnosis' | 'closing';
};

const FormBuilder = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // New Question Form State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newQuestion, setNewQuestion] = useState<{
        text: string;
        type: Question['field_type'];
        options: string;
        required: boolean;
        stage: 'diagnosis' | 'closing';
    }>({
        text: '',
        type: 'text',
        options: '',
        required: false,
        stage: 'diagnosis'
    });

    // Fetch Categories
    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('fault_categories')
                .select('*')
                .eq('is_active', true)
                .order('name_ar');

            if (error) throw error;
            setCategories(data || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setLoading(false);
        }
    };

    // Fetch Questions when Category changes
    useEffect(() => {
        if (selectedCategory) {
            fetchQuestions(selectedCategory.id);
        } else {
            setQuestions([]);
        }
    }, [selectedCategory]);

    const fetchQuestions = async (categoryId: string) => {
        try {
            const { data, error } = await supabase
                .from('category_questions' as any)
                .select('*')
                .eq('category_id', categoryId)
                .order('order_index', { ascending: true });

            if (error) throw error;
            setQuestions(data as any || []);
        } catch (err) {
            console.error('Error fetching questions:', err);
        }
    };

    const handleAddQuestion = async () => {
        if (!selectedCategory || !newQuestion.text.trim()) return;

        setSaving(true);
        try {
            const optionsArray = newQuestion.type === 'select'
                ? newQuestion.options.split(',').map(s => s.trim()).filter(Boolean)
                : null;

            const { error } = await supabase
                .from('category_questions' as any)
                .insert({
                    category_id: selectedCategory.id,
                    question_text: newQuestion.text,
                    field_type: newQuestion.type,
                    options: optionsArray,
                    is_required: newQuestion.required,
                    stage: newQuestion.stage,
                    order_index: questions.length // Append to end
                } as any);

            if (error) throw error;

            await fetchQuestions(selectedCategory.id);
            setShowAddModal(false);
            setNewQuestion({ text: '', type: 'text', options: '', required: false, stage: 'diagnosis' });
        } catch (err) {
            alert('فشل في إضافة السؤال');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteQuestion = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;

        try {
            const { error } = await supabase
                .from('category_questions' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;

            setQuestions(prev => prev.filter(q => q.id !== id));
        } catch (err) {
            alert('فشل في حذف السؤال');
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'text': return <Type className="w-4 h-4" />;
            case 'number': return <Hash className="w-4 h-4" />;
            case 'yes_no': return <ToggleLeft className="w-4 h-4" />;
            case 'photo': return <Camera className="w-4 h-4" />;
            case 'select': return <List className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'text': return 'نص';
            case 'number': return 'رقم';
            case 'yes_no': return 'نعم/لا';
            case 'photo': return 'صورة';
            case 'select': return 'قائمة اختيار';
            default: return type;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-8 font-sans" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/admin/console')}
                    className="p-2 bg-white rounded-xl hover:bg-slate-50 border border-slate-200"
                >
                    <ArrowRight className="w-5 h-5 text-slate-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">منشئ النماذج</h1>
                    <p className="text-slate-500 text-sm">تخصيص أسئلة التشخيص لكل تصنيف أعطال</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Sidebar: Categories */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h2 className="font-bold text-slate-700">التصنيفات</h2>
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            </div>
                        ) : categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat)}
                                className={`w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${selectedCategory?.id === cat.id ? 'bg-blue-50 border-r-4 border-blue-600' : ''
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{cat.icon}</span>
                                    <span className={`text-sm font-medium ${selectedCategory?.id === cat.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                        {cat.name_ar}
                                    </span>
                                </div>
                                {selectedCategory?.id === cat.id && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Area: Builder */}
                <div className="lg:col-span-3 space-y-6">
                    {!selectedCategory ? (
                        <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 flex flex-col items-center justify-center text-center">
                            <List className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">لم يتم تحديد تصنيف</h3>
                            <p className="text-slate-500 mt-2">يرجى اختيار تصنيف من القائمة الجانبية للبدء في إضافة الأسئلة</p>
                        </div>
                    ) : (
                        <>
                            {/* Toolbar */}
                            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl bg-blue-100 w-10 h-10 flex items-center justify-center rounded-xl">
                                        {selectedCategory.icon}
                                    </span>
                                    <div>
                                        <h2 className="font-bold text-slate-900">{selectedCategory.name_ar}</h2>
                                        <p className="text-xs text-slate-500 font-bold">{questions.length} أسئلة مضافة</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                                >
                                    <Plus className="w-4 h-4 ml-1" />
                                    إضافة سؤال
                                </button>
                            </div>

                            {/* Questions List */}
                            <div className="space-y-3">
                                {questions.length === 0 ? (
                                    <div className="text-center p-12 bg-slate-50 rounded-2xl border border-slate-200">
                                        <p className="text-slate-400 font-bold">لا توجد أسئلة مضافة لهذا التصنيف بعد</p>
                                    </div>
                                ) : (
                                    questions.map((q, idx) => (
                                        <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group hover:border-blue-200 transition-all shadow-sm">
                                            <div className="flex items-start gap-4">
                                                <div className="bg-slate-100 text-slate-500 w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 mb-1">{q.question_text}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 font-medium">
                                                            {getTypeIcon(q.field_type)}
                                                            {getTypeLabel(q.field_type)}
                                                        </span>
                                                        {q.is_required && (
                                                            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded font-bold">
                                                                مطلوب
                                                            </span>
                                                        )}
                                                        {q.field_type === 'select' && (
                                                            <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-1 rounded font-bold">
                                                                {q.options?.length} خيارات
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={`text-[10px] px-2 py-1 rounded font-bold mt-1 inline-block ${q.stage === 'closing' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                                                        }`}>
                                                        {q.stage === 'closing' ? 'مرحلة الإغلاق' : 'مرحلة التشخيص'}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteQuestion(q.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}

                    {/* Add Question Modal */}
                    {showAddModal && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                    <h3 className="font-bold text-lg text-slate-900">إضافة سؤال جديد</h3>
                                    <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                        <AlertCircle className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">نص السؤال</label>
                                        <input
                                            type="text"
                                            value={newQuestion.text}
                                            onChange={e => setNewQuestion({ ...newQuestion, text: e.target.value })}
                                            className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium"
                                            placeholder="مثال: هل الجهاز يصدر صوتاً غريباً؟"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">نوع الإجابة</label>
                                            <select
                                                value={newQuestion.type}
                                                onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value as any })}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium bg-white"
                                            >
                                                <option value="text">نص (Text)</option>
                                                <option value="number">رقم (Number)</option>
                                                <option value="yes_no">نعم/لا (Yes/No)</option>
                                                <option value="photo">صورة (Photo)</option>
                                                <option value="select">قائمة (Select)</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center pt-8">
                                            <label className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`
                      w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all
                      ${newQuestion.required ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white group-hover:border-blue-400'}
                    `}>
                                                    {newQuestion.required && <CheckCircle2 className="w-4 h-4 text-white" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={newQuestion.required}
                                                    onChange={e => setNewQuestion({ ...newQuestion, required: e.target.checked })}
                                                />
                                                <span className="font-bold text-slate-700">إجابة مطلوبة</span>
                                            </label>
                                        </div>
                                    </div>

                                    {newQuestion.type === 'select' && (
                                        <div className="animate-in slide-in-from-top-2">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">الخيارات (افصل بينها بفاصلة)</label>
                                            <input
                                                type="text"
                                                value={newQuestion.options}
                                                onChange={e => setNewQuestion({ ...newQuestion, options: e.target.value })}
                                                className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium"
                                                placeholder="مثال: ممتاز, جيد, سيء, تالف"
                                            />
                                            <p className="text-xs text-slate-400 mt-1 font-medium">سيتم تحويل النص إلى قائمة من الخيارات للمستخدم</p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">مرحلة السؤال</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="stage"
                                                    value="diagnosis"
                                                    checked={newQuestion.stage === 'diagnosis'}
                                                    onChange={() => setNewQuestion({ ...newQuestion, stage: 'diagnosis' })}
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                <span className="text-slate-700 font-bold">التشخيص (عند الفتح)</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="stage"
                                                    value="closing"
                                                    checked={newQuestion.stage === 'closing'}
                                                    onChange={() => setNewQuestion({ ...newQuestion, stage: 'closing' })}
                                                    className="w-4 h-4 text-blue-600"
                                                />
                                                <span className="text-slate-700 font-bold">الإغلاق (بعد الإصلاح)</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                                        <button
                                            onClick={handleAddQuestion}
                                            disabled={saving || !newQuestion.text}
                                            className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            حفظ السؤال
                                        </button>
                                        <button
                                            onClick={() => setShowAddModal(false)}
                                            disabled={saving}
                                            className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all"
                                        >
                                            إلغاء
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FormBuilder;
