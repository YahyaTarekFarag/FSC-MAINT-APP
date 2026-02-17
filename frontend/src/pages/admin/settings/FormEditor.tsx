import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Save, Plus, Trash2, Code, GripVertical, Loader2,
    Type, Hash, Camera, List, ToggleLeft
} from 'lucide-react';

type Question = {
    id: number;
    category_id: string;
    question_text: string;
    field_type: 'text' | 'number' | 'yes_no' | 'photo' | 'select';
    options: string[] | null;
    is_required: boolean;
    stage: 'diagnosis' | 'closing';
    order_index: number;
};

type Category = {
    id: string;
    name_ar: string;
};

export default function FormEditor() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedStage, setSelectedStage] = useState<'diagnosis' | 'closing'>('diagnosis');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);

    // Form State
    const [isEditing, setIsEditing] = useState<number | null>(null); // Question ID or -1 for new
    const [editForm, setEditForm] = useState<Partial<Question>>({});

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (selectedCategory) {
            fetchQuestions();
        } else {
            setQuestions([]);
        }
    }, [selectedCategory, selectedStage]);

    const fetchCategories = async () => {
        const { data } = await supabase.from('fault_categories').select('id, name_ar').eq('is_active', true).order('name_ar');
        setCategories(data || []);
        if (data && data.length > 0) setSelectedCategory(data[0].id);
    };

    const fetchQuestions = async () => {
        setLoadingData(true);
        const { data } = await supabase
            .from('category_questions')
            .select('*')
            .eq('category_id', selectedCategory)
            .eq('stage', selectedStage)
            .order('order_index');
        setQuestions(data as any || []);
        setLoadingData(false);
    };

    const handleSaveQuestion = async () => {
        if (!selectedCategory || !editForm.question_text) return;

        setLoading(true);
        try {
            const payload = {
                category_id: selectedCategory,
                stage: selectedStage,
                question_text: editForm.question_text,
                field_type: editForm.field_type || 'text',
                is_required: editForm.is_required || false,
                options: editForm.options || null,
                order_index: editForm.order_index || questions.length
            };

            if (isEditing === -1) {
                // Insert
                const { error } = await supabase.from('category_questions').insert([payload]);
                if (error) throw error;
            } else {
                // Update
                const { error } = await supabase
                    .from('category_questions')
                    .update(payload)
                    .eq('id', isEditing);
                if (error) throw error;
            }

            fetchQuestions();
            setIsEditing(null);
            setEditForm({});
        } catch (err) {
            console.error(err);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
        const { error } = await supabase.from('category_questions').delete().eq('id', id);
        if (!error) fetchQuestions();
    };

    const startEdit = (q: Question) => {
        setIsEditing(q.id);
        setEditForm(q);
    };

    const startNew = () => {
        setIsEditing(-1);
        setEditForm({
            field_type: 'text',
            is_required: false,
            options: []
        });
    };

    const fieldTypes = [
        { value: 'text', label: 'نص', icon: Type },
        { value: 'number', label: 'رقم', icon: Hash },
        { value: 'yes_no', label: 'نعم/لا', icon: ToggleLeft },
        { value: 'photo', label: 'صورة', icon: Camera },
        { value: 'select', label: 'قائمة اختيار', icon: List },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto h-screen flex flex-col font-sans" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">محرر النماذج الذكي</h1>
                    <p className="text-slate-500">تخصيص الأسئلة والحقول لكل نوع عطل</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full min-h-0">
                {/* Sidebar Controls */}
                <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 h-fit space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">نوع العطل (Category)</label>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                        >
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">مرحلة النموذج</label>
                        <div className="flex p-1 bg-slate-100 rounded-xl">
                            <button
                                onClick={() => setSelectedStage('diagnosis')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${selectedStage === 'diagnosis' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                            >
                                التشخيص
                            </button>
                            <button
                                onClick={() => setSelectedStage('closing')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${selectedStage === 'closing' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}
                            >
                                الإغلاق
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <button
                            onClick={startNew}
                            disabled={!selectedCategory || isEditing !== null}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            سؤال جديد
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">
                            {selectedStage === 'diagnosis' ? 'أسئلة التشخيص (عند فتح التذكرة)' : 'متطلبات الإغلاق (عند إنهاء العمل)'}
                        </h3>
                        <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                            {questions.length} حقول
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {loadingData ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                        ) : questions.length === 0 && isEditing === null ? (
                            <div className="text-center py-12 text-slate-400">
                                لا توجد أسئلة مضافة لهذا التصنيف بعد.
                                <br />اضغط على "سؤال جديد" للبدء.
                            </div>
                        ) : (
                            <>
                                {questions.map(q => (
                                    <div
                                        key={q.id}
                                        className={`group relative p-4 rounded-xl border-2 transition-all ${isEditing === q.id ? 'border-blue-500 bg-blue-50/10' : 'border-slate-100 hover:border-blue-200 bg-white'}`}
                                    >
                                        {isEditing === q.id ? (
                                            // Edit Mode
                                            <div className="space-y-4">
                                                <input
                                                    autoFocus
                                                    value={editForm.question_text || ''}
                                                    onChange={e => setEditForm({ ...editForm, question_text: e.target.value })}
                                                    placeholder="نص السؤال..."
                                                    className="w-full p-2 text-lg font-bold bg-transparent border-b-2 border-blue-200 focus:border-blue-500 outline-none"
                                                />
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {fieldTypes.map(ft => (
                                                        <button
                                                            key={ft.value}
                                                            onClick={() => setEditForm({ ...editForm, field_type: ft.value as any })}
                                                            className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-sm ${editForm.field_type === ft.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                                        >
                                                            <ft.icon className="w-4 h-4" />
                                                            {ft.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={editForm.is_required || false}
                                                            onChange={e => setEditForm({ ...editForm, is_required: e.target.checked })}
                                                            className="w-4 h-4 text-blue-600 rounded"
                                                        />
                                                        <span className="text-sm font-bold text-slate-700">حقل إجباري</span>
                                                    </label>
                                                </div>

                                                {editForm.field_type === 'select' && (
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-bold text-slate-500">الخيارات (افصل بينها بفاصلة)</label>
                                                        <input
                                                            value={editForm.options?.join(',') || ''}
                                                            onChange={e => setEditForm({ ...editForm, options: e.target.value.split(',').map(s => s.trim()) })}
                                                            className="w-full p-2 rounded-lg border border-slate-200 text-sm"
                                                            placeholder="مثال: خيار 1, خيار 2, خيار 3"
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button onClick={() => setIsEditing(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold">إلغاء</button>
                                                    <button onClick={handleSaveQuestion} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                        حفظ
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // View Mode
                                            <div className="flex items-start justify-between">
                                                <div className="flex gap-3 items-center">
                                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500 cursor-move"><GripVertical className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                            {q.question_text}
                                                            {q.is_required && <span className="text-red-500 text-xs bg-red-50 px-2 py-0.5 rounded-full">مطلوب</span>}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded uppercase">{q.field_type}</span>
                                                            {q.options && <span>[{q.options.join(', ')}]</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEdit(q)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Code className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDelete(q.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* New Question Form */}
                                {isEditing === -1 && (
                                    <div className="bg-blue-50 border-2 border-blue-200 border-dashed rounded-xl p-6 animate-in fade-in slide-in-from-bottom-2">
                                        <h4 className="font-bold text-blue-800 mb-4">إضافة سؤال جديد</h4>
                                        <div className="space-y-4">
                                            <input
                                                autoFocus
                                                value={editForm.question_text || ''}
                                                onChange={e => setEditForm({ ...editForm, question_text: e.target.value })}
                                                placeholder="نص السؤال..."
                                                className="w-full p-2 text-lg font-bold bg-white border border-blue-200 rounded-lg focus:border-blue-500 outline-none"
                                            />
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                                {fieldTypes.map(ft => (
                                                    <button
                                                        key={ft.value}
                                                        onClick={() => setEditForm({ ...editForm, field_type: ft.value as any })}
                                                        className={`p-2 rounded-lg border flex flex-col items-center gap-1 text-sm ${editForm.field_type === ft.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                                    >
                                                        <ft.icon className="w-4 h-4" />
                                                        {ft.label}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={editForm.is_required || false}
                                                        onChange={e => setEditForm({ ...editForm, is_required: e.target.checked })}
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                    <span className="text-sm font-bold text-slate-700">حقل إجباري</span>
                                                </label>
                                            </div>

                                            {editForm.field_type === 'select' && (
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-slate-500">الخيارات (افصل بينها بفاصلة)</label>
                                                    <input
                                                        value={editForm.options?.join(',') || ''}
                                                        onChange={e => setEditForm({ ...editForm, options: e.target.value.split(',').map(s => s.trim()) })}
                                                        className="w-full p-2 rounded-lg border border-slate-200 text-sm"
                                                        placeholder="مثال: خيار 1, خيار 2, خيار 3"
                                                    />
                                                </div>
                                            )}

                                            <div className="flex justify-end gap-2 pt-2">
                                                <button onClick={() => setIsEditing(null)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold">إلغاء</button>
                                                <button onClick={handleSaveQuestion} disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    حفظ السؤال
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
