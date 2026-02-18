import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Navigation,
    MapPin,
    ClipboardCheck,
    PenTool,
    CheckCircle2,
    ArrowLeft,
    Loader2,
    AlertTriangle,
    Search,
    Plus,
    Trash2,
    Upload,
    X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/supabase';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import toast from 'react-hot-toast';
import { uploadTicketImage } from '../../lib/storage';
import DynamicForm from '../../components/tickets/DynamicForm';

interface Ticket {
    id: string;
    status: string;
    started_at?: string;
    form_data?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    branch?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    category?: string;
    images_url?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

type Question = Database['public']['Tables']['category_questions']['Row'];
type Part = Database['public']['Tables']['spare_parts']['Row'];
type SelectedPart = Part & { quantity_needed: number };

const STEPS = [
    { id: 'travel', label: 'التوجه', icon: Navigation },
    { id: 'arrive', label: 'الوصول', icon: MapPin },
    { id: 'diagnose', label: 'التشخيص', icon: ClipboardCheck },
    { id: 'work', label: 'الإصلاح', icon: PenTool },
    { id: 'close', label: 'الإغلاق', icon: CheckCircle2 },
];

// Helper to calculate distance in meters
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export default function JobExecutionWizard() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const { getCoordinates } = useGeoLocation();

    // State for specific steps
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, any>>({}); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [saving, setSaving] = useState(false);

    // Phase 61: Dynamic Form State
    const [formResponses, setFormResponses] = useState<Record<string, any>>({});
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserProfile(data.user));
    }, []);

    // Work Step State
    // Work Step State
    const [availableParts, setAvailableParts] = useState<Part[]>([]);
    const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
    const [workNotes, setWorkNotes] = useState('');
    const [partSearch, setPartSearch] = useState('');
    const [showPartSearch, setShowPartSearch] = useState(false);
    const [partsLoaded, setPartsLoaded] = useState(false);



    // Close Step State
    const [finalImages, setFinalImages] = useState<File[]>([]);
    const [finalImageUrls, setFinalImageUrls] = useState<string[]>([]);
    const [closingData, setClosingData] = useState({
        customerRating: 0,
        signature: false // Simple checkbox for now
    });

    // --- Define Callbacks BEFORE useEffect ---

    const fetchTicket = useCallback(async () => {
        if (!id) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from('tickets') as any)
                .select('*, branch:branches(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            setTicket(data);

            // Only set step if we have data to make a decision
            if (data) {
                if (data.status === 'open') setCurrentStep(0);
                else if (data.status === 'in_progress') {
                    if (!data.started_at) setCurrentStep(0);
                    else if (data.form_data && Object.keys(data.form_data).length > 0) {
                        // Check if work notes exist to maybe jump to close?
                        // For now default to Work step if Diagnose done (form_data exists)
                        setCurrentStep(3);
                    }
                    else setCurrentStep(1);
                } else if (data.status === 'resolved' || data.status === 'closed') {
                    setCurrentStep(4);
                }
            }
        } catch (error) {
            console.error('Error fetching ticket:', error);
            toast.error('فشل تحميل بيانات المهمة');
        }
    }, [id]);

    const fetchParts = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('spare_parts')
                .select('*')
                .gt('quantity', 0) // Only available parts
                .order('name_ar');

            if (error) throw error;
            setAvailableParts(data || []);
            setPartsLoaded(true);
        } catch (error) {
            console.error('Error fetching parts:', error);
        }
    }, []);

    const fetchQuestionsForCategory = useCallback(async (categoryName: string) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: catData } = await (supabase.from('fault_categories') as any)
                .select('id')
                .eq('name_ar', categoryName)
                .single();

            if (catData) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: qData } = await (supabase.from('category_questions') as any)
                    .select('*')
                    .eq('category_id', catData.id)
                    .eq('stage', 'diagnosis')
                    .order('order_index');

                if (qData) setQuestions(qData);
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        }
    }, []);


    // --- Effects ---

    useEffect(() => {
        if (id) fetchTicket();
    }, [id, fetchTicket]);

    useEffect(() => {
        if (ticket?.category) {
            fetchQuestionsForCategory(ticket.category);
        }
        if (ticket?.form_data) {
            setAnswers(ticket.form_data);
            if (ticket.form_data.work_notes) setWorkNotes(ticket.form_data.work_notes);
        }
        // Initialize Work step data if resuming
        if (ticket) {
            if (currentStep === 3 && !partsLoaded) {
                fetchParts();
            }
        }
    }, [ticket, currentStep, partsLoaded, fetchParts, fetchQuestionsForCategory]);

    useEffect(() => {
        // Fetch parts when reaching Work step or if needed
        if (currentStep === 3 && !partsLoaded) {
            fetchParts();
        }
    }, [currentStep, partsLoaded, fetchParts]);


    // --- Handlers ---

    const handleAnswerChange = (questionId: number, value: string | number | boolean) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleStartTravel = async () => {
        if (!ticket) return;
        setLoading(true);
        try {
            const coords = await getCoordinates();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('tickets') as any)
                .update({
                    status: 'in_progress',
                    start_work_lat: coords.latitude,
                    start_work_lng: coords.longitude,
                    started_at: new Date().toISOString()
                })
                .eq('id', id!);

            if (error) throw error;
            toast.success('تم تسجيل بدء التحرك 🚀');
            setCurrentStep(1);
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء بدء المهمة');
        } finally {
            setLoading(false);
        }
    };

    const handleArrive = async () => {
        setLoading(true);
        try {
            const coords = await getCoordinates();
            if (!ticket) return;
            let distanceFromBranch = 0;
            if (ticket && ticket.branch?.location_lat && ticket.branch?.location_lng) {
                distanceFromBranch = calculateDistance(
                    coords.latitude,
                    coords.longitude,
                    ticket.branch.location_lat,
                    ticket.branch.location_lng
                );
            }

            const GEOFENCE_RADIUS = 500;
            if (distanceFromBranch > GEOFENCE_RADIUS) {
                const confirm = window.confirm(`أنت تبعد ${Math.round(distanceFromBranch)} متر عن الموقع المسجل. هل تريد تسجيل الوصول على أي حال؟`);
                if (!confirm) {
                    setLoading(false);
                    return;
                }
            }

            toast.success('تم تسجيل الوصول للموقع 📍');
            setCurrentStep(2);
        } catch (error) {
            console.error(error);
            toast.error('تعذر تحديد الموقع');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDiagnosis = async () => {
        const missingRequired = questions.filter(q => q.is_required && !answers[q.id]);
        if (missingRequired.length > 0) {
            toast.error('يرجى الإجابة على جميع الأسئلة المطلوبة');
            return;
        }

        if (!ticket) return;
        setSaving(true);
        try {
            // Append to existing form_data if needed, but usually we just overwrite/merge
            const currentFormData = ticket.form_data || {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('tickets') as any)
                .update({
                    form_data: { ...currentFormData, ...answers }
                })
                .eq('id', id!);

            if (error) throw error;
            toast.success('تم حفظ التشخيص ✅');
            setCurrentStep(3);
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء حفظ التشخيص');
        } finally {
            setSaving(false);
        }
    };

    // Work Step Handlers
    // Work Step Handlers
    const addPart = (part: Part) => {
        const existing = selectedParts.find(p => p.id === part.id);
        if (existing) {
            toast.error('هذه القطعة مضافة بالفعل');
            return;
        }
        setSelectedParts([...selectedParts, { ...part, quantity_needed: 1 }]);
        setShowPartSearch(false);
        setPartSearch('');
    };

    const removePart = (partId: number) => {
        setSelectedParts(selectedParts.filter(p => p.id !== partId));
    };

    const updatePartQuantity = (partId: number, qty: number) => {
        if (qty < 1) return;
        setSelectedParts(selectedParts.map(p =>
            p.id === partId ? { ...p, quantity_needed: qty } : p
        ));
    };

    const handleFinishWork = async () => {
        if (!workNotes && selectedParts.length === 0) {
            if (!window.confirm('لم تقم بإضافة أي قطع غيار أو ملاحظات. هل أنت متأكد من المتابعة؟')) return;
        }

        setSaving(true);
        try {
            // 1. Consume Parts if any
            if (selectedParts.length > 0) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('No user found');

                const partsToConsume = selectedParts.map((p: SelectedPart) => ({
                    part_id: p.id,
                    quantity: p.quantity_needed
                }));

                // Note: we need to cast to correct type for RPC or pass as json if function accepts json
                // The defined function public.consume_parts accepts p_parts public.part_consumption[]
                // Supabase JS client handles array of objects if keys match the composite type

                // @ts-expect-error - Supabase RPC type mismatch
                const { error: rpcError } = await supabase.rpc('consume_parts', {
                    p_ticket_id: id!,
                    p_user_id: user.id,
                    p_parts: partsToConsume
                });

                if (rpcError) throw rpcError;
            }

            if (!ticket) return;
            // 2. Update Ticket with Notes
            const currentFormData = ticket.form_data || {};
            const updatedFormData = { ...currentFormData, ...answers, work_notes: workNotes };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from('tickets') as any)
                .update({
                    form_data: updatedFormData,
                    // We could update status here, but we wait for Close step
                }).eq('id', id!);

            toast.success('تم تسجيل تفاصيل الإصلاح 🛠️');
            setCurrentStep(4);

        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ أثناء حفظ تفاصيل العمل');
        } finally {
            setSaving(false);
        }
    };

    // Close Step Handlers
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setFinalImages(prev => [...prev, ...newFiles]);
            // Create previews
            const newUrls = newFiles.map(file => URL.createObjectURL(file));
            setFinalImageUrls(prev => [...prev, ...newUrls]);
        }
    };

    const removeImage = (index: number) => {
        setFinalImages(prev => prev.filter((_, i) => i !== index));
        setFinalImageUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleCloseTicket = async () => {
        if (!closingData.signature) {
            toast.error('يرجى تأكيد إتمام العمل');
            return;
        }

        setSaving(true);
        try {
            // 1. Upload Images
            const uploadedUrls = [];
            for (const file of finalImages) {
                const url = await uploadTicketImage(file);
                if (url) uploadedUrls.push(url);
            }

            if (!ticket) return;
            // 2. Close Ticket
            const currentImages = ticket.images_url || [];
            const allImages = [...currentImages, ...uploadedUrls];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('tickets') as any)
                .update({
                    status: 'resolved',
                    images_url: allImages,
                    completed_at: new Date().toISOString(),
                })
                .eq('id', id!);

            // 3. Save Form Responses (Phase 61)
            if (Object.keys(formResponses).length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: formError } = await (supabase.from('form_responses') as any)
                    .insert({
                        ticket_id: id,
                        form_key: 'job_report',
                        responses: formResponses,
                        submitted_by: (ticket as any).assigned_technician?.id || (ticket as any).technician_id
                    });

                if (formError) throw formError;
            }

            // 3. Save Form Responses (Phase 61)
            if (Object.keys(formResponses).length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: formError } = await (supabase.from('form_responses') as any)
                    .insert({
                        ticket_id: id,
                        form_key: 'job_report',
                        responses: formResponses,
                        submitted_by: userProfile?.id
                    });

                if (formError) throw formError;
            }

            if (error) throw error;

            toast.success('تم إغلاق المهمة بنجاح! 🎉');
            navigate('/dashboard');

        } catch (error) {
            console.error('Error closing ticket:', error);
            toast.error('فشل إغلاق المهمة');
        } finally {
            setSaving(false);
        }
    };

    const renderQuestionInput = (q: Question) => {
        switch (q.field_type) {
            case 'yes_no':
                return (
                    <div className="flex gap-4">
                        <label className={`flex-1 p-3 rounded-xl border cursor-pointer text-center font-bold transition-all ${answers[q.id] === 'yes' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}>
                            <input type="radio" className="hidden" name={`q_${q.id}`} checked={answers[q.id] === 'yes'} onChange={() => handleAnswerChange(q.id, 'yes')} />
                            نعم
                        </label>
                        <label className={`flex-1 p-3 rounded-xl border cursor-pointer text-center font-bold transition-all ${answers[q.id] === 'no' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white border-slate-200 text-slate-500'}`}>
                            <input type="radio" className="hidden" name={`q_${q.id}`} checked={answers[q.id] === 'no'} onChange={() => handleAnswerChange(q.id, 'no')} />
                            لا
                        </label>
                    </div>
                );
            case 'select':
                return (
                    <select
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-blue-500 font-medium"
                    >
                        <option value="">اختر الإجابة...</option>
                        {q.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            case 'number':
                return (
                    <input
                        type="number"
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                        placeholder="أدخل رقماً..."
                    />
                );
            case 'text':
            default:
                return (
                    <input
                        type="text"
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                        placeholder="أدخل الإجابة..."
                    />
                );
        }
    };

    if (!ticket) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    const renderStepContent = () => {
        switch (currentStep) {
            case 0: // TRAVEL
                return (
                    <div className="space-y-6 text-center pt-10 animate-in slide-in-from-bottom-4">
                        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600 shadow-blue-200 shadow-lg">
                            <Navigation className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">جاهز للتحرك؟</h2>
                            <p className="text-slate-500 mt-2">سيتم تسجيل وقت ومكان بدء الحركة نحو الفرع.</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-right space-y-4 max-w-sm mx-auto">
                            <div className="flex items-start gap-3">
                                <div className="bg-slate-50 p-2 rounded-lg">
                                    <MapPin className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold">الوجهة</p>
                                    <p className="font-bold text-slate-900">{ticket.branch.name_ar}</p>
                                    <p className="text-xs text-slate-500 mt-1">{ticket.branch.city}</p>
                                </div>
                            </div>
                            {ticket.branch.google_map_link && (
                                <a
                                    href={ticket.branch.google_map_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full text-center bg-slate-50 hover:bg-slate-100 text-blue-600 font-bold py-3 rounded-xl transition-colors border border-slate-200"
                                >
                                    فتح في خرائط Google
                                </a>
                            )}
                        </div>
                    </div>
                );

            case 1: // ARRIVE
                return (
                    <div className="space-y-6 text-center pt-10 animate-in slide-in-from-bottom-4">
                        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600 shadow-amber-200 shadow-lg">
                            <MapPin className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">الوصول للموقع</h2>
                            <p className="text-slate-500 mt-2">يرجى تأكيد وصولك للفرع للبدء في التشخيص.</p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-sm font-bold flex items-center gap-3 max-w-sm mx-auto text-right">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            يجب أن تكون داخل نطاق الفرع (500 متر) لتسجيل الوصول.
                        </div>
                    </div>
                );

            case 2: // DIAGNOSE
                return (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-bottom-4">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-600 mb-4">
                                <ClipboardCheck className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">التشخيص</h2>
                            <p className="text-slate-500 mt-2">أجب على أسئلة التشخيص التالية</p>
                        </div>

                        <div className="space-y-4">
                            {questions.length === 0 ? (
                                <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                                    لا توجد أسئلة تشخيص محددة لهذا التصنيف.
                                    <br />
                                    يمكنك تخطي هذه الخطوة.
                                </div>
                            ) : (
                                questions.map((q, idx) => (
                                    <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                        <label className="block font-bold text-slate-900 mb-3">
                                            <span className="text-slate-400 ml-2">#{idx + 1}</span>
                                            {q.question_text}
                                            {q.is_required && <span className="text-red-500 mr-1">*</span>}
                                        </label>
                                        {renderQuestionInput(q)}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );

            case 3: // WORK
                return (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-bottom-4">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600 mb-4">
                                <PenTool className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">الإصلاح</h2>
                            <p className="text-slate-500 mt-2">سجل تفاصيل الإصلاح وقطع الغيار</p>
                        </div>

                        {/* Notes */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <label className="font-bold text-slate-700">ملاحظات الإصلاح</label>
                            <textarea
                                value={workNotes}
                                onChange={(e) => setWorkNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none h-32 resize-none"
                                placeholder="صف ما قمت بإصلاحه..."
                            />
                        </div>

                        {/* Spare Parts */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-slate-700">قطع الغيار المستخدمة</label>
                                <button
                                    onClick={() => setShowPartSearch(!showPartSearch)}
                                    className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    إضافة قطعة
                                </button>
                            </div>

                            {/* Add Part Search */}
                            {showPartSearch && (
                                <div className="space-y-2 animate-in slide-in-from-top-2">
                                    <div className="relative">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <input
                                            autoFocus
                                            type="text"
                                            placeholder="بحث عن قطعة..."
                                            value={partSearch}
                                            onChange={(e) => setPartSearch(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-sm focus:border-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                                        {availableParts.filter(p => p.name_ar.toLowerCase().includes(partSearch.toLowerCase())).map(part => (
                                            <button
                                                key={part.id}
                                                onClick={() => addPart(part)}
                                                className="w-full text-right p-3 hover:bg-slate-50 text-sm font-medium flex justify-between items-center"
                                            >
                                                <span>{part.name_ar}</span>
                                                <span className="text-slate-400 text-xs">({part.quantity} متوفر)</span>
                                            </button>
                                        ))}
                                        {availableParts.filter(p => p.name_ar.toLowerCase().includes(partSearch.toLowerCase())).length === 0 && (
                                            <div className="p-3 text-center text-slate-400 text-sm">لا توجد نتائج</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Added Parts List */}
                            {selectedParts.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedParts.map((part) => (
                                        <div key={part.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex-1">
                                                <p className="font-bold text-slate-900">{part.name_ar}</p>
                                                <p className="text-xs text-slate-500">{part.part_number}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={part.quantity}
                                                    value={part.quantity_needed}
                                                    onChange={(e) => updatePartQuantity(part.id, parseInt(e.target.value))}
                                                    className="w-16 text-center p-1 rounded-lg border border-slate-300"
                                                />
                                                <button
                                                    onClick={() => removePart(part.id)}
                                                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-slate-400 text-center text-sm py-4">لم يتم إضافة قطع غيار</p>
                            )}
                        </div>

                        {/* Phase 61: Dynamic Job Report Form */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <label className="font-bold text-slate-700 block border-b border-slate-100 pb-2 mb-4">تقرير الإنجاز (إضافي)</label>
                            <DynamicForm
                                formKey="job_report"
                                onChange={setFormResponses}
                            />
                        </div>
                    </div>
                );

            case 4: // CLOSE
                return (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-bottom-4">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">إغلاق المهمة</h2>
                            <p className="text-slate-500 mt-2">إرفاق الصور النهائية وإتمام المهمة</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <label className="font-bold text-slate-700">صور ما بعد الإصلاح</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {finalImageUrls.map((url, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                                        <img src={url} alt="Final" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all text-slate-400 hover:text-blue-600">
                                    <Upload className="w-6 h-6" />
                                    <span className="text-xs font-bold">إضافة صورة</span>
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                            <label className="flex items-center gap-3 cursor-pointer p-4 hover:bg-slate-50 rounded-xl transition-colors">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${closingData.signature ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                    {closingData.signature && <CheckCircle2 className="w-4 h-4 text-white" />}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={closingData.signature}
                                    onChange={(e) => setClosingData({ ...closingData, signature: e.target.checked })}
                                />
                                <span className="font-bold text-slate-900">أقر بأنني قمت بإتمام العمل على أكمل وجه</span>
                            </label>
                        </div>
                    </div>
                );

            default:
                return <div>الخطوة قيد التطوير</div>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans rtl" dir="rtl">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10 border-b border-slate-100">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full"><ArrowLeft className="w-6 h-6 text-slate-500" /></button>
                <div className="flex-1">
                    <h1 className="font-bold text-lg text-slate-900">تنفيذ المهمة <span className="font-mono text-base">#{ticket.id.slice(0, 6)}</span></h1>
                    <p className="text-xs text-slate-500 font-bold">{ticket.branch.brand?.name_ar || ''} - {ticket.branch.name_ar}</p>
                </div>
                <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                    {STEPS[currentStep].label}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white px-6 pb-6 pt-2 border-b border-slate-100 overflow-x-auto">
                <div className="flex justify-between relative min-w-[300px]">
                    <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-100 -z-0"></div>
                    {STEPS.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = idx === currentStep;
                        const isCompleted = idx < currentStep;

                        return (
                            <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                    ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' :
                                        isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}
                                `}>
                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                                </div>
                                <span className={`text-[10px] font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 pb-32">
                {renderStepContent()}
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
                {currentStep === 0 && (
                    <button
                        onClick={handleStartTravel}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                        بدء التحرك للموقع
                    </button>
                )}

                {currentStep === 1 && (
                    <button
                        onClick={handleArrive}
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-lg shadow-slate-200 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                        تأكيد الوصول للموقع
                    </button>
                )}

                {currentStep === 2 && (
                    <button
                        onClick={handleSaveDiagnosis}
                        disabled={saving}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        حفظ ومتابعة
                    </button>
                )}

                {currentStep === 3 && (
                    <button
                        onClick={handleFinishWork}
                        disabled={saving}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenTool className="w-5 h-5" />}
                        إتمام الإصلاح
                    </button>
                )}

                {currentStep === 4 && (
                    <button
                        onClick={handleCloseTicket}
                        disabled={saving || !closingData.signature}
                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-300"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        إغلاق المهمة نهائياً
                    </button>
                )}

                {currentStep > 0 && currentStep < 4 && (
                    <div className="flex gap-3 mt-3">
                        <button
                            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                            disabled={loading || saving}
                            className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold border border-slate-200 text-sm"
                        >
                            رجوع
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
