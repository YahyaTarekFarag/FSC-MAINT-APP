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
        const key = fieldKey || questionId;
        if (!key) return; // Safety check
        const newAnswers = { ...(answers || {}), [key]: value };
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
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 shadow-2xl space-y-8 animate-in slide-in-from-bottom-2 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
            <div className="border-b border-white/20 pb-8 mb-4 relative z-10">
                <h3 className="font-black text-white text-2xl md:text-3xl tracking-tight">تفاصيل إضافية مطلوبة</h3>
                <p className="text-white/40 text-lg md:text-xl font-medium leading-relaxed mt-2">يرجى الإجابة على الأسئلة التالية لتشخيص العطل بدقة</p>
            </div>

            <div className="space-y-8 relative z-10">
                {questions.map(q => (
                    <div key={q.id}>
                        <label className="block font-black text-white/80 text-lg md:text-xl mb-4 flex items-center gap-2 leading-none">
                            {q.question_text}
                            {q.is_required && <span className="text-red-500 text-2xl leading-none">*</span>}
                        </label>

                        {/* Text Input */}
                        {q.field_type === 'text' && (
                            <div className="relative">
                                <input
                                    type="text"
                                    required={q.is_required}
                                    value={answers[q.field_key || q.id] || ''}
                                    onChange={e => handleAnswerChange(q.id, e.target.value, q.field_key)}
                                    className="w-full bg-white/5 border border-white/20 rounded-2xl px-6 py-5 pl-14 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xl md:text-2xl font-black text-white placeholder:text-white/20"
                                    placeholder="إجابتك هنا..."
                                />
                                <Type className="absolute left-5 top-5.5 w-7 h-7 text-white/20" />
                            </div>
                        )}

                        {/* Textarea Input */}
                        {q.field_type === 'textarea' && (
                            <div className="relative">
                                <textarea
                                    required={q.is_required}
                                    value={answers[q.field_key || q.id] || ''}
                                    onChange={e => handleAnswerChange(q.id, e.target.value, q.field_key)}
                                    className="w-full bg-white/5 border border-white/20 rounded-2xl px-6 py-5 pl-14 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-h-[150px] text-xl md:text-2xl font-black text-white placeholder:text-white/20"
                                    placeholder="تفاصيل إضافية..."
                                />
                                <AlignLeft className="absolute left-5 top-5.5 w-7 h-7 text-white/20" />
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
                                    className="w-full bg-white/5 border border-white/20 rounded-2xl px-6 py-5 pl-14 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xl md:text-2xl font-black text-white placeholder:text-white/20"
                                    placeholder="0"
                                />
                                <Hash className="absolute left-5 top-5.5 w-7 h-7 text-white/20" />
                            </div>
                        )}

                        {/* Select Input */}
                        {q.field_type === 'select' && (
                            <div className="relative">
                                <select
                                    required={q.is_required}
                                    value={answers[q.field_key || q.id] || ''}
                                    onChange={e => handleAnswerChange(q.id, e.target.value, q.field_key)}
                                    className="w-full bg-white/5 border border-white/20 rounded-2xl px-6 py-5 pl-14 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none text-xl md:text-2xl font-black text-white group-hover:bg-white/10"
                                >
                                    <option value="" className="bg-slate-900">اختر إجابة...</option>
                                    {(q.options || []).map(opt => (
                                        <option key={opt} value={opt} className="bg-slate-900">{opt}</option>
                                    ))}
                                </select>
                                <List className="absolute left-5 top-5.5 w-7 h-7 text-white/20 pointer-events-none" />
                            </div>
                        )}

                        {/* Yes/No Toggle */}
                        {q.field_type === 'yes_no' && (
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => handleAnswerChange(q.id, 'نعم', q.field_key)}
                                    className={`flex-1 py-5 rounded-2xl font-black text-xl md:text-2xl border transition-all ${answers[q.field_key || q.id] === 'نعم'
                                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                        }`}
                                >
                                    نعم
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAnswerChange(q.id, 'لا', q.field_key)}
                                    className={`flex-1 py-5 rounded-2xl font-black text-xl md:text-2xl border transition-all ${answers[q.field_key || q.id] === 'لا'
                                        ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20'
                                        : 'bg-white/5 border-white/20 text-white/40 hover:bg-white/10'
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
                    flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all
                    ${q.is_required && !answers[q.field_key || q.id] ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/20 hover:bg-white/5'}
                    ${uploadingState[q.id as any] ? 'opacity-50 pointer-events-none' : ''}
                  `}>
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {uploadingState[q.id as any] ? (
                                                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                                            ) : (
                                                <Camera className="w-10 h-10 text-white/20 mb-3" />
                                            )}
                                            <p className="text-sm text-white/40 font-black">اضغط لالتقاط صورة</p>
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
                                    <div className="relative rounded-[2rem] overflow-hidden border border-white/20 group w-fit shadow-2xl">
                                        <img src={answers[q.field_key || q.id]} alt="Evidence" className="h-48 w-auto object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => handleAnswerChange(q.id, null, q.field_key)}
                                            className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <div className="absolute bottom-4 left-4 bg-emerald-500 text-white text-xs px-3 py-1 rounded-full flex items-center gap-2 font-black">
                                            <CheckCircle2 className="w-4 h-4" />
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
                                    className="w-full bg-white/5 border border-white/20 rounded-2xl px-6 py-5 pl-14 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xl md:text-2xl font-black text-white"
                                />
                                <Calendar className="absolute left-5 top-5.5 w-7 h-7 text-white/20" />
                            </div>
                        )}

                        {/* Checkbox Input */}
                        {q.field_type === 'checkbox' && (
                            <label className="flex items-center gap-3 p-5 bg-white/5 border border-white/20 rounded-2xl cursor-pointer hover:bg-white/10 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={!!answers[q.field_key || q.id]}
                                    onChange={e => handleAnswerChange(q.id, e.target.checked, q.field_key)}
                                    className="w-6 h-6 rounded-lg border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500/20"
                                />
                                <span className="font-black text-white text-lg">{q.question_text}</span>
                            </label>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DynamicForm;
