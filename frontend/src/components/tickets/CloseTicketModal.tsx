import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Search, Trash2, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, MapPin, CreditCard } from 'lucide-react';
import { saveClosureOffline } from '../../utils/offlineSync';
import { calculateDistance } from '../../utils/helpers';
import toast from 'react-hot-toast';
import DynamicForm from './DynamicForm';
import { differenceInMinutes } from 'date-fns';
import { TicketService } from '../../services/TicketService';

type CloseTicketModalProps = {
    ticketId: string;
    categoryId: string;
    onClose: () => void;
    onSuccess: () => void;
};

type SparePart = {
    id: number;
    part_name: string;
    sku: string | null;
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
    const [laborCost, setLaborCost] = useState<number>(0);
    const [expenseAmount, setExpenseAmount] = useState<number>(0);
    const [expenseDesc, setExpenseDesc] = useState<string>('');

    // Geofencing State
    const [geofenceValid, setGeofenceValid] = useState(true);
    const [distanceToBranch, setDistanceToBranch] = useState<number | null>(null);
    const [checkingLocation, setCheckingLocation] = useState(true);

    // Time Tracking
    const [startedAt, setStartedAt] = useState<string | null>(null);
    const [assetId, setAssetId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

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
                supabase.from('inventory').select('*').eq('is_active', true).gt('quantity', 0)
            ]);

            const ticketRes = await supabase.from('tickets').select('asset_id, branch:branches(location_lat, location_lng), started_at').eq('id', ticketId).single();

            const isEnabled = (geofencingRes.data as unknown as { value: string })?.value === 'true';
            // Cast for join result
            const ticketData = ticketRes.data as unknown as { asset_id: string | null, branch: { location_lat: number | null; location_lng: number | null } | null, started_at: string | null };
            const branch = ticketData?.branch;
            const startedAtVal = ticketData?.started_at;

            if (ticketData?.asset_id) {
                setAssetId(ticketData.asset_id);
            }

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
                        setLocationAccuracy(position.coords.accuracy);
                        setCheckingLocation(false);
                    },
                    (error) => {
                        let errorMsg = 'تعذر تحديد موقعك. يرجى تفعيل الـ GPS.';
                        if (error.code === 1) errorMsg = 'الرجاء السماح للمتصفح بصلاحية الموقع للمتابعة';
                        if (error.code === 3) errorMsg = 'انتهى وقت طلب الموقع (Timeout). يرجى التأكد من التواجد في منطقة مكشوفة';
                        toast.error(errorMsg);
                        setGeofenceValid(false);
                        setCheckingLocation(false);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } else {
                toast.error('جهازك لا يدعم تحديد الموقع');
                setGeofenceValid(false);
                setCheckingLocation(false);
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                setUserRole((profile as { role: string } | null)?.role || null);
            }

        } catch (err) {
            console.error('Check failed:', err);
            setGeofenceValid(true);
            setCheckingLocation(false);
        }
    };

    // Removed fetchParts as it's now handled in checkGeofenceAndDetails

    const handleAddPart = async (part: SparePart) => {
        if (selectedParts.find(p => p.id === part.id)) return;

        // Compatibility Check
        if (assetId) {
            const validation = await TicketService.validatePartCompatibility(part.id, assetId);
            if (!validation.valid) {
                if (validation.severity === 'error') {
                    toast.error(validation.message || 'قطعة غير متوافقة');
                    // Option: return; to block. Or allow with confirmation. 
                    // Requirement implies "Logical Lockdown", so we block if error.
                    return;
                } else {
                    toast(validation.message || 'تحذير توافق', { icon: '⚠️' });
                }
            }
        }

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
        const partsCost = selectedParts.reduce((acc, part) => acc + (part.price * part.used_quantity), 0);
        return partsCost + laborCost;
    };

    // Live Cost Warning
    useEffect(() => {
        const checkCost = async () => {
            if (assetId && selectedParts.length > 0) {
                const total = calculateTotalCost();
                const result = await TicketService.checkRepairCostWarning(assetId, total);
                if (!result.valid && result.message) {
                    toast(result.message, {
                        icon: '💰',
                        duration: 6000,
                        style: {
                            borderRadius: '10px',
                            background: '#fff7ed',
                            color: '#c2410c',
                            border: '1px solid #ffedd5'
                        },
                    });
                }
            }
        };
        const timer = setTimeout(checkCost, 800); // Debounce
        return () => clearTimeout(timer);
    }, [selectedParts, assetId]);

    const handleSubmit = async () => {
        // Validation: If parts are used, Asset ID is mandatory
        if (selectedParts.length > 0 && !assetId) {
            toast.error('لا يمكن إغلاق البلاغ مع استهلاك قطع غيار دون ربط "معدة/أصل" بالبلاغ أولاً. يرجى ربط المعدة من تفاصيل البلاغ.', {
                duration: 5000,
                icon: '🚫'
            });
            return;
        }

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

            // 1. Transactional Updates
            const transactionPromise = async () => {
                // A. Consume Parts
                for (const part of selectedParts) {
                    const { error: rpcError } = await (supabase.rpc as any)('consume_spare_part', {
                        p_ticket_id: ticketId,
                        p_part_id: part.id,
                        p_quantity: part.used_quantity,
                        p_technician_id: user.id
                    });
                    if (rpcError) throw new Error(`فشل استهلاك القطعة ${part.part_name}: ${rpcError.message}`);
                }

                // B. Log Petty Cash
                if (expenseAmount > 0) {
                    const { error: expError } = await (supabase
                        .from('maintenance_expenses') as any)
                        .insert({
                            ticket_id: ticketId,
                            amount: expenseAmount,
                            description: expenseDesc || 'مصروفات إصلاح',
                            created_by: user.id
                        });
                    if (expError) throw expError;
                }
            };

            await toast.promise(transactionPromise(), {
                loading: 'جاري تحديث المخزون وتسجيل المصروفات...',
                success: 'تم تحديث البيانات المالية بنجاح',
                error: (err: any) => {
                    if (err.message?.includes('RESOURCE_BUSY') || err.code === '55P03') {
                        return 'النظام مشغول حالياً بمعالجة العهدة. يرجى المحاولة بعد ثوانٍ 🔄';
                    }
                    if (err.message?.includes('STATE_MACHINE_VIOLATION')) {
                        return 'لا يمكن إغلاق البلاغ مباشرة (مخالفة لآلية الاعتماد) ⚠️';
                    }
                    if (err.code === '23505') {
                        return 'سجل مكرر: هذا الإجراء موجود مسبقاً ⚠️';
                    }
                    return err.message || 'فشل التحديث المالي ❌';
                }
            });
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
                .from('tickets') as any)
                .update({
                    status: 'pending_approval' as const,
                    closed_at: closedAt,
                    repair_cost: calculateTotalCost() - laborCost,
                    maintenance_cost: calculateTotalCost(),
                    form_data: mergedFormData,
                    repair_duration: repairDuration > 0 ? repairDuration : null
                })
                .eq('id', ticketId);

            if (updateError) throw updateError;

            toast.success('تم إرسال البلاغ لمدير الفرع للمراجعة والاستلام');
            onSuccess();
        } catch (err: any) {
            let msg = 'حدث خطأ أثناء إغلاق البلاغ ❌';
            if (err.message?.includes('STATE_MACHINE_VIOLATION')) {
                msg = 'مخالفة لآلية الاعتماد: لا يمكن تجاوز سير العمل ⚠️';
            }
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredParts = parts.filter(p =>
        p.part_name.includes(searchTerm) ||
        (p.sku && p.sku.includes(searchTerm))
    );

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 min-h-[100dvh]" dir="rtl">
            <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-white">
                            {userRole === 'technician' ? 'إرسال طلب اعتماد الإصلاح' : 'إتمام الإصلاح وإغلاق البلاغ'}
                        </h2>
                        <p className="text-sm text-white/40 font-bold mt-1">
                            {step === 1 ? 'خطوة 1: استهلاك قطع الغيار' : 'خطوة 2: التوثيق النهائي'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors border border-transparent hover:border-white/10">
                        <ArrowRight className="w-5 h-5 rtl:-scale-x-100" />
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

                {locationAccuracy && locationAccuracy > 50 && (
                    <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center gap-3 animate-in slide-in-from-top duration-300">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-amber-800">إشارة GPS ضعيفة ({Math.round(locationAccuracy)}م)</p>
                            <p className="text-xs text-amber-600">تأكد من تواجدك في منطقة مكشوفة لضمان دقة تحديد الموقع.</p>
                        </div>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 ? (
                        <div className="space-y-6">
                            {/* Search Parts */}
                            <div className="relative z-20">
                                <label className="block text-sm font-black text-white mb-2">إضافة قطع غيار مستخدمة</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="ابحث باسم القطعة..."
                                        className="w-full p-4 ps-14 pe-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-blue-500 outline-none transition-all font-bold"
                                    />
                                    <Search className="absolute start-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
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
                                                    <span className="font-bold text-slate-700">{part.part_name}</span>
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
                                        <div key={part.id} className="flex items-center justify-between bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                                                    <Package className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-white">{part.part_name}</p>
                                                    <p className="text-sm font-bold text-white/40">{part.price} ج.م</p>
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

                            {selectedParts.length > 0 && !assetId && (
                                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 animate-pulse">
                                    <AlertTriangle className="w-6 h-6 text-red-600" />
                                    <div>
                                        <p className="font-bold text-red-800">تنبيه هام</p>
                                        <p className="text-sm text-red-600">
                                            لقد قمت بإضافة قطع غيار، ولكن هذا البلاغ غير مرتبط بأي "معدة". لن تتمكن من الإغلاق حتى يتم ربط المعدة لضمان سلامة المخزون.
                                        </p>
                                    </div>
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

                            {/* Petty Cash / Expenses */}
                            <div className="space-y-4 pt-4 border-t border-slate-100">
                                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-emerald-600" />
                                    المصروفات النثرية (Petty Cash)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">المبلغ (ج.م)</label>
                                        <input
                                            type="number"
                                            value={expenseAmount || ''}
                                            onChange={(e) => setExpenseAmount(Number(e.target.value))}
                                            placeholder="0"
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">بيان المصروف</label>
                                        <input
                                            type="text"
                                            value={expenseDesc}
                                            onChange={(e) => setExpenseDesc(e.target.value)}
                                            placeholder="مثال: شراء نثريات..."
                                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Labor Cost Input */}
                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                <label className="block text-sm font-bold text-slate-700">تكلفة العمالة / المشوار (ج.م)</label>
                                <input
                                    type="number"
                                    value={laborCost || ''}
                                    onChange={(e) => setLaborCost(Number(e.target.value))}
                                    placeholder="0"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-lg"
                                />
                                <p className="text-[10px] text-slate-400 font-medium">سيتم إضافة هذا المبلغ إلى إجمالي تكلفة الصيانة (TCO)</p>
                            </div>

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
                <div className="p-6 border-t border-white/10 bg-white/5 flex gap-3">
                    {step === 1 ? (
                        <>
                            <div className="flex-1"></div>
                            <button
                                onClick={() => setStep(2)}
                                className="bg-white/10 border border-white/20 text-white px-8 py-4 rounded-2xl font-black hover:bg-white/20 transition-all flex items-center gap-3"
                            >
                                التالي: التوثيق
                                <ArrowLeft className="w-5 h-5 rtl:-scale-x-100" />
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
                                {geofenceValid
                                    ? (userRole === 'technician' ? 'إرسال لطلب الاعتماد' : 'إغلاق البلاغ نهائياً')
                                    : 'يجب التواجد في الفرع'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CloseTicketModal;
