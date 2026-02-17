import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Package, Search, Trash2, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, MapPin } from 'lucide-react';
import { saveClosureOffline } from '../../utils/offlineSync';
import { calculateDistance } from '../../utils/helpers';
import toast from 'react-hot-toast';
import DynamicForm from './DynamicForm';
import { differenceInMinutes } from 'date-fns';

type CloseTicketModalProps = {
    ticketId: string;
    categoryId: string;
    onClose: () => void;
    onSuccess: () => void;
};

type SparePart = {
    id: number;
    name_ar: string;
    part_number: string | null;
    quantity: number;
    price: number;
};

type SelectedPart = SparePart & {
    used_quantity: number;
};

const CloseTicketModal: React.FC<CloseTicketModalProps> = ({ ticketId, categoryId, onClose, onSuccess }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [submitting, setSubmitting] = useState(false);

    // Inventory State
    const [parts, setParts] = useState<SparePart[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);

    // Closing Form State
    const [formAnswers, setFormAnswers] = useState<Record<number, unknown>>({});

    // Geofencing State
    const [geofenceValid, setGeofenceValid] = useState(true);
    const [distanceToBranch, setDistanceToBranch] = useState<number | null>(null);
    const [checkingLocation, setCheckingLocation] = useState(true);

    // Time Tracking
    const [startedAt, setStartedAt] = useState<string | null>(null);

    useEffect(() => {
        checkGeofenceAndDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticketId]);

    const checkGeofenceAndDetails = async () => {
        setCheckingLocation(true);
        try {
            // Fetch Ticket Config & Details
            const [geofencingRes, partsRes] = await Promise.all([
                supabase.from('system_config').select('value').eq('key', 'geofencing_enabled').single(),
                supabase.from('spare_parts').select('*').gt('stock_quantity', 0)
            ]);

            const ticketRes = await supabase.from('tickets').select('branch:branches(location_lat, location_lng), started_at').eq('id', ticketId).single();

            const isEnabled = (geofencingRes.data as unknown as { value: string })?.value === 'true';
            // Cast for join result
            const branch = (ticketRes.data as unknown as { branch: { location_lat: number | null; location_lng: number | null } | null })?.branch;
            const startedAtVal = (ticketRes.data as unknown as { started_at: string | null })?.started_at;

            if (partsRes.data) setParts(partsRes.data);

            if (startedAtVal) {
                setStartedAt(startedAtVal);
            }

            if (!isEnabled) {
                setGeofenceValid(true);
                setCheckingLocation(false);
                return;
            }

            if (!branch || !branch.location_lat || !branch.location_lng) {
                console.warn('Branch location not found, skipping geofence');
                setGeofenceValid(true);
                setCheckingLocation(false);
                return;
            }

            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const dist = calculateDistance(
                            position.coords.latitude,
                            position.coords.longitude,
                            Number(branch.location_lat),
                            Number(branch.location_lng)
                        );
                        setDistanceToBranch(Math.round(dist));
                        setGeofenceValid(dist <= 200);
                        setCheckingLocation(false);
                    },
                    (error) => {
                        console.error('Error getting location:', error);
                        toast.error('تعذر تحديد موقعك. يرجى تفعيل الـ GPS.');
                        setGeofenceValid(false);
                        setCheckingLocation(false);
                    }
                );
            } else {
                toast.error('جهازك لا يدعم تحديد الموقع');
                setGeofenceValid(false);
                setCheckingLocation(false);
            }

        } catch (err) {
            console.error('Check failed:', err);
            setGeofenceValid(true);
            setCheckingLocation(false);
        }
    };

    // Removed fetchParts as it's now handled in checkGeofenceAndDetails

    const handleAddPart = (part: SparePart) => {
        if (selectedParts.find(p => p.id === part.id)) return;
        setSelectedParts([...selectedParts, { ...part, used_quantity: 1 }]);
        setSearchTerm('');
    };

    const handleRemovePart = (partId: number) => {
        setSelectedParts(prev => prev.filter(p => p.id !== partId));
    };

    const updatePartQuantity = (partId: number, qty: number) => {
        if (qty < 1) return;
        const part = parts.find(p => p.id === partId);
        if (part && qty > part.quantity) {
            toast.error(`الكمية المتاحة فقط ${part.quantity}`);
            return;
        }
        setSelectedParts(prev => prev.map(p => p.id === partId ? { ...p, used_quantity: qty } : p));
    };

    const calculateTotalCost = () => {
        return selectedParts.reduce((acc, part) => acc + (part.price * part.used_quantity), 0);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const closedAt = new Date().toISOString();

            // Calculate Duration
            let repairDuration = 0;
            if (startedAt) {
                repairDuration = differenceInMinutes(new Date(closedAt), new Date(startedAt));
            }

            // Offline Check
            if (!navigator.onLine) {
                const offlineData = {
                    selectedParts,
                    formAnswers,
                    closedAt,
                    repairCost: calculateTotalCost(),
                    repairDuration,
                };

                await saveClosureOffline(ticketId, offlineData);
                toast.success('لا يوجد اتصال بالإنترنت. تم حفظ البيانات وسيتم إرسالها تلقائياً 📡');
                onSuccess();
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // 1. Update stock levels and register parts (RPC)
            // consume_parts is the correct name from migration
            type ConsumePartsCall = (
                name: 'consume_parts',
                args: { p_ticket_id: string; p_user_id: string; p_parts: { part_id: number; quantity: number }[] }
            ) => Promise<{ error: unknown }>;

            const { error: rpcError } = await (supabase.rpc as unknown as ConsumePartsCall)(
                'consume_parts',
                {
                    p_ticket_id: ticketId,
                    p_user_id: user.id,
                    p_parts: selectedParts.map(p => ({
                        part_id: p.id,
                        quantity: p.used_quantity
                    }))
                }
            );

            if (rpcError) throw rpcError;
            // 2. Merge Form Data
            const ticketRes = await supabase
                .from('tickets')
                .select('*, branch:branches(location_lat, location_lng)')
                .eq('id', ticketId)
                .single();

            const mergedFormData = {
                ...((ticketRes.data as unknown as { form_data: Record<string, unknown> })?.form_data || {}),
                ...formAnswers
            };

            // 3. Update Ticket
            const { error: updateError } = await (supabase
                .from('tickets') as unknown as { update: (data: unknown) => { eq: (col: string, val: string) => Promise<{ error: unknown }> } })
                .update({
                    status: 'closed' as const,
                    closed_at: closedAt,
                    repair_cost: calculateTotalCost(),
                    form_data: mergedFormData,
                    repair_duration: repairDuration > 0 ? repairDuration : null
                })
                .eq('id', ticketId);

            if (updateError) throw updateError;

            toast.success('تم إغلاق البلاغ بنجاح');
            onSuccess();
        } catch (err) {
            console.error('Error closing ticket:', err);
            toast.error('حدث خطأ أثناء إغلاق البلاغ.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredParts = parts.filter(p =>
        p.name_ar.includes(searchTerm) ||
        (p.part_number && p.part_number.includes(searchTerm))
    );

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">إتمام الإصلاح وإغلاق البلاغ</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            {step === 1 ? 'خطوة 1: استهلاك قطع الغيار' : 'خطوة 2: التوثيق النهائي'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
                        <ArrowRight className="w-5 h-5 text-slate-400 rotate-180" />
                    </button>
                </div>

                {/* Geofencing Alert */}
                {!checkingLocation && (
                    geofenceValid && distanceToBranch !== null ? (
                        <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-center gap-3 animate-in fade-in">
                            <div className="bg-emerald-100 p-2 rounded-full">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-emerald-800">أنت في الموقع الصحيح</p>
                                <p className="text-xs text-emerald-600">
                                    المسافة الحالية: <span className="font-bold">{distanceToBranch} متر</span> (داخل النطاق)
                                </p>
                            </div>
                        </div>
                    ) : !geofenceValid && (
                        <div className="bg-red-50 border-b border-red-100 p-4 flex items-center gap-3 animate-in fade-in">
                            <div className="bg-red-100 p-2 rounded-full">
                                <MapPin className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-red-800">أنت خارج نطاق الفرع</p>
                                <p className="text-xs text-red-600">
                                    المسافة الحالية: <span className="font-bold">{distanceToBranch} متر</span> (المسموح: 200 متر)
                                </p>
                            </div>
                        </div>
                    )
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 ? (
                        <div className="space-y-6">
                            {/* Search Parts */}
                            <div className="relative z-20">
                                <label className="block text-sm font-bold text-slate-700 mb-2">إضافة قطع غيار مستخدمة</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="ابحث باسم القطعة..."
                                        className="w-full p-3 pl-10 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                                    />
                                    <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                </div>

                                {/* Dropdown Results */}
                                {searchTerm && (
                                    <div className="absolute w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-2 max-h-48 overflow-y-auto">
                                        {filteredParts.length === 0 ? (
                                            <div className="p-3 text-slate-500 text-sm text-center">لا توجد نتائج</div>
                                        ) : (
                                            filteredParts.map(part => (
                                                <button
                                                    key={part.id}
                                                    onClick={() => handleAddPart(part)}
                                                    disabled={selectedParts.some(p => p.id === part.id)}
                                                    className="w-full text-right p-3 hover:bg-slate-50 flex justify-between items-center disabled:opacity-50"
                                                >
                                                    <span className="font-bold text-slate-700">{part.name_ar}</span>
                                                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{part.price} ج.م</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Selected Parts List */}
                            <div className="space-y-3">
                                {selectedParts.length === 0 ? (
                                    <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-slate-500 text-sm">لم يتم إضافة أي قطع غيار</p>
                                    </div>
                                ) : (
                                    selectedParts.map(part => (
                                        <div key={part.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{part.name_ar}</p>
                                                    <p className="text-xs text-slate-500">{part.price} ج.م</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                                                    <button
                                                        onClick={() => updatePartQuantity(part.id, part.used_quantity - 1)}
                                                        className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:text-blue-600"
                                                    >-</button>
                                                    <span className="font-bold w-4 text-center">{part.used_quantity}</span>
                                                    <button
                                                        onClick={() => updatePartQuantity(part.id, part.used_quantity + 1)}
                                                        className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:text-blue-600"
                                                    >+</button>
                                                </div>
                                                <button
                                                    onClick={() => handleRemovePart(part.id)}
                                                    className="text-red-400 hover:text-red-600 p-2"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Total Cost */}
                            {selectedParts.length > 0 && (
                                <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
                                    <span className="font-bold">إجمالي تكلفة القطع</span>
                                    <span className="text-xl font-bold font-mono">{calculateTotalCost().toLocaleString()} ج.م</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <DynamicForm
                                categoryId={categoryId}
                                stage="closing"
                                onChange={setFormAnswers}
                            />

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                <p className="text-sm text-blue-800 font-medium">
                                    بإغلاقك للبلاغ، أنت تؤكد إتمام جميع أعمال الإصلاح واختبار الجهاز. لا يمكن التراجع عن هذا الإجراء.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                    {step === 1 ? (
                        <>
                            <div className="flex-1"></div>
                            <button
                                onClick={() => setStep(2)}
                                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                            >
                                التالي: التوثيق
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep(1)}
                                disabled={submitting}
                                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all flex items-center gap-2"
                            >
                                <ArrowRight className="w-5 h-5" />
                                السابق
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !geofenceValid}
                                className={`flex-1 text-white py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2
                                    ${geofenceValid
                                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                        : 'bg-slate-400 cursor-not-allowed shadow-none'}
                                `}
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                {geofenceValid ? 'إغلاق البلاغ نهائياً' : 'يجب التواجد في الفرع'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CloseTicketModal;
