import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { SovereignWizard } from '../../components/tickets/SovereignWizard';
import {
    Loader2,
    Calendar,
    MapPin,
    AlertTriangle,
    ArrowRight,
    MessageCircle,
    CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import { NotificationEngine } from '../../utils/NotificationEngine';

export default function JobExecutionWizard() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState<any>(null); // Keep any for DB row for now as it's complex, but handle nulls
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const geofence = useGeoLocation();

    const isAllowed = !geofence.coords || !ticket?.branch?.location_lat
        ? true
        : geofence.isWithinRadius(
            geofence.coords.latitude,
            geofence.coords.longitude,
            Number(ticket.branch.location_lat),
            Number(ticket.branch.location_lng)
        );

    useEffect(() => {
        const fetchTicket = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('tickets')
                    .select('*, branch:branches(*)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error('التذكرة غير موجودة');

                setTicket(data);
            } catch (error: any) {
                console.error('[Sovereign Debug]: Fetch error', error);
                toast.error(`خطأ: ${error.message || 'فشل تحميل بيانات التذكرة'}`);
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        fetchTicket();
    }, [id, navigate]);

    const handleComplete = async (formData: any) => {
        // Geofencing Check
        if (!isAllowed) {
            toast.error('يجب أن تكون في موقع العطل للمتابعة السيادية');
            return;
        }

        try {
            toast.loading('جاري تنفيذ المعالجة السيادية...', { id: 'executing' });

            // 1. Update ticket status and metadata
            const updatePayload = {
                status: 'closed', // Match the enum: open, in_progress, closed
                description: formData.technical_notes || formData.issue_description || ticket?.description,
                images_url: formData.media_upload || [],
                closed_at: new Date().toISOString(),
                resolved_at: new Date().toISOString(),
                // Map dynamic data if exists
                asset_id: formData.asset_id || ticket?.asset_id,
                priority: formData.severity_level || ticket?.priority
            };

            const { error: updateError } = await (supabase.from('tickets') as any)
                .update(updatePayload)
                .eq('id', id!);

            if (updateError) {
                throw updateError;
            }

            // 2. Inventory Transaction (Example: if part used)
            if (formData.spare_part_id && formData.quantity) {
                const { error: rpcError } = await (supabase as any).rpc('consume_spare_part', {
                    p_part_id: formData.spare_part_id,
                    p_quantity: parseInt(formData.quantity, 10),
                    p_ticket_id: id
                });
            }

            toast.success('تم إتمام المهمة بنجاح سيادي! ✨', { id: 'executing' });
            setSubmitted(true);
            // navigate('/dashboard');

        } catch (err: any) {
            console.error('[Sovereign Debug] Execution Error:', err);
            let errMsg = (err as any)?.message || 'خطأ غير معروف';
            if (errMsg.includes('RESOURCE_BUSY')) {
                errMsg = 'النظام مشغول حالياً بمعالجة هذا العنصر، يرجى المحاولة بعد ثوانٍ.';
            }
            toast.error(`فشل تنفيذ العملية: ${errMsg}`, { id: 'executing' });
        }
    };

    if (submitted) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-right" dir="rtl">
            <div className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 text-center space-y-8 animate-in zoom-in duration-500">
                <div className="bg-emerald-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/40">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white tracking-tight">تم الإنجاز بنجاح!</h2>
                    <p className="text-white/40 text-sm font-medium italic">تم تحديث حالة البلاغ وإغلاقه في السجل السيادي</p>
                </div>

                <div className="space-y-4 pt-4">
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">إجراءات فورية</p>
                    <button
                        onClick={() => {
                            if (ticket?.branch?.phone) {
                                NotificationEngine.openWhatsApp(ticket.branch.phone, 'ticket_assigned', {
                                    name: ticket.branch.name_ar,
                                    ticket_id: ticket.id.slice(0, 8),
                                    branch: ticket.branch.name_ar,
                                    issue: ticket.fault_category
                                });
                            } else {
                                toast.error('رقم هاتف الفرع غير متوفر');
                            }
                        }}
                        className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl font-black shadow-lg shadow-green-900/40 flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                        <MessageCircle className="w-6 h-6" />
                        تنبيه الفرع بالإصلاح
                    </button>

                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold border border-white/10 transition-all"
                    >
                        العودة للمهام
                    </button>
                </div>
            </div>
        </div>
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-slate-500 font-bold">جاري تحميل المهمة السيادية...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-900 pb-20 pt-6 px-4">
            {/* Context Header */}
            <div className="max-w-xl mx-auto mb-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white"
                    >
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">{ticket?.fault_category}</h1>
                        <p className="text-white/40 text-sm flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {ticket?.branch?.name_ar}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black text-white">
                        {ticket?.id.substring(0, 8)}
                    </span>
                    <span className="text-white/40 text-[10px] mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ticket?.created_at).toLocaleDateString('ar-EG')}
                    </span>
                </div>
            </div>

            {/* Geofencing Status */}
            {!isAllowed && (
                <div className="max-w-xl mx-auto mb-6 bg-amber-500/20 border border-amber-500/40 p-4 rounded-2xl flex items-center gap-3 text-amber-200">
                    <AlertTriangle className="w-6 h-6 shrink-0" />
                    <p className="text-xs font-bold leading-relaxed">
                        تنبيه: أنت خارج النطاق الجغرافي للفرع. يرجى التواجد في الموقع لتفعيل صلاحية الإرسال السيادية.
                    </p>
                </div>
            )}

            {/* Sovereign Wizard Implementation */}
            <main>
                <SovereignWizard
                    formKey="ticket_maintenance_v1"
                    onComplete={handleComplete}
                    initialData={{ technical_notes: ticket?.completion_notes }}
                    context={{ branchId: ticket?.branch_id }}
                />
            </main>
        </div>
    );
}
