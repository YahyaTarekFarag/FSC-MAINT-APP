import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadTicketImage } from '../../lib/storage';
import { compressImage, fileToBase64 } from '../../utils/imageCompressor';
import toast from 'react-hot-toast';
import {
    Type,
    Hash,
    Camera,
    List,
    Loader2,
    CheckCircle2,
    X,
    Calendar,
    AlignLeft
} from 'lucide-react';

type Question = {
    id: number | string; // Support UUID from form_definitions
    question_text: string;
    field_type: 'text' | 'number' | 'yes_no' | 'photo' | 'select' | 'date' | 'textarea' | 'checkbox';
    options: string[] | null;
    is_required: boolean;
    field_key?: string; // For form_responses
};

interface DynamicFormProps {
    categoryId?: string;
    formKey?: string;
    stage?: 'diagnosis' | 'closing';
    onChange: (answers: Record<string, any>) => void;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ categoryId, formKey, stage = 'diagnosis', onChange }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (categoryId || formKey) {
            fetchQuestions();
            setAnswers({});
        }
    }, [categoryId, formKey, stage]);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            let data: any[] = [];

            if (formKey) {
                // Fetch from form_definitions
                const { data: formData, error } = await (supabase.from('form_definitions') as any)
                    .select('*')
                    .eq('form_key', formKey)
                    .eq('is_active', true)
                    .order('order_index');

                if (error) throw error;

                // Map to compatible Question structure
                data = (formData || []).map((f: any) => ({
                    id: f.id,
                    question_text: f.label,
                    field_type: f.type,
                    options: f.options,
                    is_required: f.is_required,
                    field_key: f.field_key
                }));
            } else if (categoryId) {
                // Legacy: Fetch from category_questions
                const { data: catData, error } = await (supabase.from('category_questions') as any)
                    .select('*')
                    .eq('category_id', categoryId)
                    .eq('stage', stage)
                    .order('order_index');

                if (error) throw error;
                data = catData || [];
            }

            setQuestions(data);
        } catch (err) {
            console.error('Error fetching questions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId: string | number, value: any, fieldKey?: string) => {
        // Use fieldKey for the output if available (for form_definitions), otherwise use ID (for category_questions)
        const key = fieldKey || questionId;
        const newAnswers = { ...answers, [key]: value };
        setAnswers(newAnswers);
        onChange(newAnswers);
    };

    // ... (component)

    const handleFileUpload = async (questionId: string | number, file: File, fieldKey?: string) => {
        // File size validation: max 5MB
        const MAX_SIZE_MB = 5;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            toast.error(`حجم الصورة كبير جداً، الحد الأقصى ${MAX_SIZE_MB} ميجا`);
            return;
        }

        setUploadingState(prev => ({ ...prev, [questionId]: true }));
        try {
            // 1. Compress
            const compressedFile = await compressImage(file);

            // 2. Offline Check
            if (!navigator.onLine) {
                const base64 = await fileToBase64(compressedFile);
                handleAnswerChange(questionId, base64, fieldKey);
                toast.success('تم حفظ الصورة محلياً (وضع الطيران) ✈️');
                return;
            }

            // 3. Online Upload
            const url = await uploadTicketImage(compressedFile);
            handleAnswerChange(questionId, url, fieldKey);
        } catch (err) {
            console.error(err);
            toast.error('فشل معالجة/رفع الصورة');
        } finally {
            setUploadingState(prev => ({ ...prev, [questionId]: false }));
        }
    };

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
    if (questions.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-bottom-2">
            <div className="border-b border-slate-100 pb-4">
                <h3 className="font-bold text-slate-900 text-lg">تفاصيل إضافية مطلوبة</h3>
                <p className="text-slate-500 text-sm">يرجى الإجابة على الأسئلة التالية لتشخيص العطل بدقة</p>
            </div>

            <div className="space-y-6">
                {questions.map(q => (
                    <div key={q.id}>
                        <label className="block font-bold text-slate-700 mb-2 flex items-center gap-2">
                            {q.question_text}
                            {q.is_required && <span className="text-red-500 text-sm">*</span>}
                        </label>

                        {/* Text Input */}
                        {q.field_type === 'text' && (
                            <div className="relative">
                                <input
                                    type="text"
                                    required={q.is_required}
                                    value={answers[q.field_key || q.id] || ''}
                                    onChange={e => handleAnswerChange(q.id, e.target.value, q.field_key)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="إجابتك هنا..."
                                />
                                <Type className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                            </div>
                        )}

                        {/* Textarea Input */}
                        {q.field_type === 'textarea' && (
                            <div className="relative">
                                <textarea
                                    required={q.is_required}
                                    value={answers[q.field_key || q.id] || ''}
                                    onChange={e => handleAnswerChange(q.id, e.target.value, q.field_key)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-h-[100px]"
                                    placeholder="تفاصيل إضافية..."
                                />
                                <AlignLeft className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                            </div>
                        )}

                        {/* Number Input */}
                        {q.field_type === 'number' && (
                            <div className="relative">
                                <input
                                    type="number"
                                    required={q.is_required}
                                    value={answers[q.field_key || q.id] || ''}
                                    onChange={e => handleAnswerChange(q.id, e.target.value, q.field_key)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="0"
                                />
                                <Hash className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                            </div>
                        )}

                        {/* Select Input */}
                        {q.field_type === 'select' && (
                            <div className="relative">
                                <select
                                    required={q.is_required}
                                    value={answers[q.field_key || q.id] || ''}
                                    onChange={e => handleAnswerChange(q.id, e.target.value, q.field_key)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
                                >
                                    <option value="">اختر إجابة...</option>
                                    {q.options?.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <List className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                            </div>
                        )}

                        {/* Yes/No Toggle */}
                        {q.field_type === 'yes_no' && (
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleAnswerChange(q.id, 'نعم', q.field_key)}
                                    className={`flex-1 py-3 rounded-xl font-bold border transition-all ${answers[q.field_key || q.id] === 'نعم'
                                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    نعم
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAnswerChange(q.id, 'لا', q.field_key)}
                                    className={`flex-1 py-3 rounded-xl font-bold border transition-all ${answers[q.field_key || q.id] === 'لا'
                                        ? 'bg-red-50 border-red-500 text-red-700'
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    لا
                                </button>
                            </div>
                        )}

                        {/* Photo Input */}
                        {q.field_type === 'photo' && (
                            <div>
                                {!answers[q.field_key || q.id] ? (
                                    <label className={`
                    flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all
                    ${q.is_required && !answers[q.field_key || q.id] ? 'border-blue-300 bg-blue-50/10' : 'border-slate-300 hover:bg-slate-50'}
                    ${uploadingState[q.id as any] ? 'opacity-50 pointer-events-none' : ''}
                  `}>
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {uploadingState[q.id as any] ? (
                                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                                            ) : (
                                                <Camera className="w-8 h-8 text-slate-400 mb-2" />
                                            )}
                                            <p className="text-sm text-slate-500 font-bold">اضغط لالتقاط صورة</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleFileUpload(q.id, file, q.field_key);
                                            }}
                                        />
                                    </label>
                                ) : (
                                    <div className="relative rounded-xl overflow-hidden border border-slate-200 group w-fit">
                                        <img src={answers[q.field_key || q.id]} alt="Evidence" className="h-32 w-auto object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => handleAnswerChange(q.id, null, q.field_key)}
                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <div className="absolute bottom-2 left-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                                            <CheckCircle2 className="w-3 h-3" />
                                            تم الرفع
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}


                        {/* Date Input */}
                        {q.field_type === 'date' && (
                            <div className="relative">
                                <input
                                    type="date"
                                    required={q.is_required}
                                    value={answers[q.field_key || q.id] || ''}
                                    onChange={e => handleAnswerChange(q.id, e.target.value, q.field_key)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                                <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                            </div>
                        )}

                        {/* Checkbox Input */}
                        {q.field_type === 'checkbox' && (
                            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={!!answers[q.field_key || q.id]}
                                    onChange={e => handleAnswerChange(q.id, e.target.checked, q.field_key)}
                                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="font-bold text-slate-700">{q.question_text}</span>
                            </label>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DynamicForm;
