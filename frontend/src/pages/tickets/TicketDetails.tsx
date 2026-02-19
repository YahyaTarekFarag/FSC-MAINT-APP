import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    MapPin,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    Play,
    ExternalLink,
    MessageSquare,
    Building2,
    Image as ImageIcon,
    Loader2,
    User,
    Activity,
    History,
    Clock,
    Coins
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/supabase';
import TicketComments from '../../components/tickets/TicketComments';
import CloseTicketModal from '../../components/tickets/CloseTicketModal';
import { AssetHistoryDrawer } from '../../components/assets/AssetHistoryDrawer';
import TechnicianRecommendation from '../../components/tickets/TechnicianRecommendation';
import TechnicianMap from '../../pages/admin/users/TechnicianMap';
import { useGeoLocation } from '../../hooks/useGeoLocation';
import { X, MessageCircle } from 'lucide-react';
import { NotificationEngine } from '../../utils/NotificationEngine';
import { TicketAuditLog } from '../../components/tickets/TicketAuditLog';
import { HandoverApprovalModal } from '../../components/tickets/HandoverApprovalModal';
import toast from 'react-hot-toast';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
    branch: Database['public']['Tables']['branches']['Row'];
    form_data?: Record<string, unknown>;
    category_id?: string;
    technician?: { full_name: string | null };
    maintenance_assets?: { name: string } | null;
    maintenance_cost?: number | null;
    status: string;
};



type Question = {
    id: number;
    question_text: string;
    field_type: string;
};

interface TicketDetailsProps {
    userProfile: Database['public']['Tables']['profiles']['Row'] | null;
}

const TicketDetails: React.FC<TicketDetailsProps> = ({ userProfile }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [questionsMap, setQuestionsMap] = useState<Record<string, Question>>({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
    const [showDispatchMap, setShowDispatchMap] = useState(false);
    const [showHandoverModal, setShowHandoverModal] = useState(false);
    const { getCoordinates } = useGeoLocation();

    const handleWhatsApp = async (phone: string | null, type: 'branch' | 'technician') => {
        if (!phone || !ticket) return;

        const templateKey = ticket.status === 'open' ? 'new_ticket' :
            ticket.status === 'in_progress' ? 'ticket_assigned' :
                'new_ticket'; // default

        const data = {
            name: type === 'branch' ? ticket.branch.name_ar : (ticket.technician?.full_name || 'الفني'),
            ticket_id: ticket.id.slice(0, 8),
            branch: ticket.branch.name_ar,
            issue: ticket.fault_category,
            reason: '' // For rejection if needed
        };

        await NotificationEngine.openWhatsApp(phone, templateKey, data);
    };

    // Assignment State
    // Assignment State
    const [selectedTech, setSelectedTech] = useState<string>('');
    const [isAssigning, setIsAssigning] = useState(false);

    type TicketFormData = Record<string, unknown>;

    const fetchTicketDetails = useCallback(async () => {
        if (!id) return;
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select('*, branch:branches!inner(id, name_ar, google_map_link), technician:technician_id(full_name), maintenance_assets(name)')
                .eq('id', id)
                .single();

            if (error) throw error;
            const ticketData = (data as unknown) as Ticket;
            setTicket(ticketData);

            // Fetch questions if form_data exists
            const formData = ticketData.form_data as TicketFormData;
            if (formData && Object.keys(formData).length > 0) {
                const questionIds = Object.keys(formData).map(Number);
                const { data: questions, error: qError } = await supabase
                    .from('category_questions')
                    .select('id, question_text, field_type')
                    .in('id', questionIds);

                if (!qError && questions) {
                    const map: Record<string, Question> = {};
                    (questions as unknown as Question[]).forEach((q: Question) => {
                        map[q.id.toString()] = q;
                    });
                    setQuestionsMap(map);
                }
            }

        } catch (err) {
            console.error('Error fetching ticket details:', err);
            navigate('/tickets');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchTicketDetails();
    }, [fetchTicketDetails]);

    const handleAssignTechnician = async () => {
        if (!ticket || !selectedTech) return;
        setIsAssigning(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('tickets') as any)
                .update({ technician_id: selectedTech, status: 'in_progress' })
                .eq('id', ticket.id);

            if (error) throw error;
            await fetchTicketDetails();
            toast.success('تم تعيين الفني بنجاح');
            setSelectedTech('');
        } catch (error) {
            console.error('Error assigning technician:', error);
            toast.error('فشل تعيين الفني');
        } finally {
            setIsAssigning(false);
        }
    };

    const updateStatus = async (newStatus: 'in_progress' | 'closed') => {
        if (!ticket || !id) return;
        setActionLoading(true);
        try {
            let coords = null;
            try {
                coords = await getCoordinates();
            } catch (geoErr) {
                console.warn('Geolocation failed, proceeding without coordinates:', geoErr);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updateData: any = {
                status: newStatus,
                technician_id: userProfile?.id,
                updated_at: new Date().toISOString()
            };

            if (coords) {
                if (newStatus === 'in_progress') {
                    updateData.start_work_lat = coords.latitude;
                    updateData.start_work_lng = coords.longitude;
                    updateData.started_at = new Date().toISOString(); // Capture start time
                } else if (newStatus === 'closed') {
                    updateData.end_work_lat = coords.latitude;
                    updateData.end_work_lng = coords.longitude;
                    // closed_at is usually handled by DB trigger or we can set it here if needed, 
                    // but supabase.ts shows 'closed_at' is nullable string
                    updateData.closed_at = new Date().toISOString();
                }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('tickets') as any)
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // Refresh ticket data
            await fetchTicketDetails();
            toast.success('تم تحديث حالة البلاغ بنجاح');
        } catch (err) {
            console.error('Error updating ticket status:', err);
            toast.error('خطأ في تحديث حالة البلاغ');
        } finally {
            setActionLoading(false);
        }
    };

    const statusConfig = {
        open: { label: 'مفتوح', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: AlertTriangle },
        in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Play },
        closed: { label: 'مغلق', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
        pending_approval: { label: 'بانتظار الاعتماد', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Clock }
    };

    const priorityLabels: Record<string, string> = {
        low: 'عادي',
        medium: 'متوسط',
        high: 'عاجل',
        urgent: 'طارئ جداً'
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-medium">جاري تحميل تفاصيل البلاغ...</p>
            </div>
        );
    }

    if (!ticket) return null;

    const currentStatus = statusConfig[ticket.status as keyof typeof statusConfig];

    return (
        <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/tickets')}
                        className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 transition-colors shadow-sm"
                    >
                        <ArrowRight className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold text-slate-900">{ticket.fault_category}</h1>
                            <div className={`px-3 py-0.5 rounded-full text-[10px] font-black border ${currentStatus.color}`}>
                                {currentStatus.label}
                            </div>
                        </div>
                        <p className="text-slate-500 text-sm flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            تم الإنشاء في {new Date(ticket.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* TCO Display (Closed Tickets) */}
                {ticket.status === 'closed' && (
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col items-end gap-1 animate-in zoom-in duration-500">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">إجمالي تكلفة الصيانة (TCO)</span>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-slate-900 font-mono">
                                {(ticket.maintenance_cost || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">ج.م</span>
                            </span>
                            <div className="bg-emerald-500 text-white p-2 rounded-xl shadow-lg shadow-emerald-200">
                                <Coins className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Actions (Technician) & History */}
                <div className="flex items-center gap-3">
                    {ticket.asset_id && (
                        <button
                            onClick={() => setShowHistoryDrawer(true)}
                            className="h-14 md:h-auto bg-white text-slate-600 px-6 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
                            title="سجل الماكينة"
                        >
                            <History className="w-5 h-5 text-purple-600" />
                            <span className="hidden md:inline">سجل الماكينة</span>
                        </button>
                    )}

                    {userProfile?.role === 'technician' && ticket.status !== 'closed' && (
                        <>
                            {ticket.status === 'open' && (
                                <button
                                    disabled={actionLoading}
                                    onClick={() => updateStatus('in_progress')}
                                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6 fill-current" />}
                                    بدء العمل
                                </button>
                            )}
                            {ticket.status === 'in_progress' && (
                                <button
                                    disabled={actionLoading}
                                    onClick={() => setShowCloseModal(true)}
                                    className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                                    {userProfile?.role === 'technician' ? 'إتمام وطلب اعتماد' : 'إغلاق البلاغ'}
                                </button>
                            )}
                        </>
                    )}

                    {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (ticket.status as any) === 'pending_approval' && (
                        <button
                            onClick={() => setShowHandoverModal(true)}
                            className="bg-purple-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-purple-700 active:scale-95 transition-all shadow-lg shadow-purple-500/20"
                        >
                            <CheckCircle2 className="w-6 h-6" />
                            مراجعة واعتماد الإصلاح
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Detailed Description */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                            وصف المشكلة
                        </div>
                        <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap">
                            {ticket.description || 'لا يوجد وصف تفصيلي للمشكلة'}
                        </p>
                    </div>

                    {/* Diagnostic Data (Dynamic Form) */}
                    {ticket.form_data && Object.keys(ticket.form_data).length > 0 && (
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                                <Activity className="w-5 h-5 text-blue-600" />
                                بيانات التشخيص
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.entries(ticket.form_data).map(([key, value]) => {
                                    const question = questionsMap[key];
                                    return (
                                        <div key={key} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-xs text-slate-500 font-bold mb-1">
                                                {question ? question.question_text : 'سؤال غير معروف'}
                                            </p>
                                            <div className="font-medium text-slate-900">
                                                {question?.field_type === 'yes_no' ? (
                                                    value === 'yes' ?
                                                        <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> نعم</span> :
                                                        <span className="text-slate-500">لا</span>
                                                ) : question?.field_type === 'photo' ? (
                                                    <a href={value as string} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline flex items-center gap-1">
                                                        <ImageIcon className="w-4 h-4" /> عرض الصورة
                                                    </a>
                                                ) : (
                                                    <span>{String(value)}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Image Gallery */}
                    {ticket.images_url && ticket.images_url.length > 0 && (
                        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                                <ImageIcon className="w-5 h-5 text-blue-600" />
                                المرفقات المصورة
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {ticket.images_url.map((url, idx) => (
                                    <div key={idx} className="group relative rounded-2xl overflow-hidden cursor-zoom-in">
                                        <img
                                            src={url}
                                            alt={`Attachment ${idx + 1}`}
                                            className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Activity & Comments Feed */}
                    <TicketComments ticketId={ticket.id} />

                    {/* Audit Trail (Admin/Manager only) */}
                    {(userProfile?.role?.toLowerCase() === 'admin' || userProfile?.role?.toLowerCase() === 'manager') && (
                        <TicketAuditLog recordId={ticket.id} />
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    {/* Branch Details */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-600" />
                            معلومات الفرع
                        </h3>

                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400 font-bold">اسم الفرع</span>
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => navigate(`/branches?id=${ticket.branch.id}`)}
                                        className="text-slate-700 font-bold hover:text-blue-600 transition-colors text-right"
                                    >
                                        {ticket.branch.name_ar}
                                    </button>
                                    {ticket.branch.phone && (
                                        <button
                                            onClick={() => handleWhatsApp(ticket.branch.phone, 'branch')}
                                            className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 active:scale-90 transition-all border border-emerald-200/50"
                                            title="واتساب الفرع"
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-slate-400 font-bold">الأولوية</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-slate-700 font-bold">{priorityLabels[ticket.priority]}</span>
                                </div>
                            </div>


                            {ticket.branch.google_map_link && (
                                <a
                                    href={ticket.branch.google_map_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-slate-50 text-slate-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-100"
                                >
                                    <MapPin className="w-4 h-4" />
                                    موقـع الفرع (Maps)
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>
                    </div>

                    {/* SLA Deadline Card */}
                    {ticket.due_date && ticket.status !== 'closed' && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-600" />
                                الموعد النهائي (SLA)
                            </h3>

                            <div className="space-y-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs text-slate-400 font-bold">الموعد المحدد</span>
                                    <span className="text-slate-900 font-bold font-mono">
                                        {new Date(ticket.due_date).toLocaleString('ar-EG', { dateStyle: 'long', timeStyle: 'short' })}
                                    </span>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    {(() => {
                                        const due = new Date(ticket.due_date);
                                        const now = new Date();
                                        const diffMs = due.getTime() - now.getTime();
                                        const diffHours = diffMs / (1000 * 60 * 60);

                                        if (diffHours < 0) {
                                            return (
                                                <div className="flex items-center gap-2 text-red-600 font-bold">
                                                    <AlertTriangle className="w-5 h-5" />
                                                    <span>متأخر بـ {Math.abs(Math.round(diffHours))} ساعة</span>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div className={`flex items-center gap-2 font-bold ${diffHours < 4 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    <Clock className="w-5 h-5" />
                                                    <span>متبقي {Math.floor(diffHours)} ساعة و {Math.round((diffHours % 1) * 60)} دقيقة</span>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Assignment Card (Admin/Manager) */}
                    {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && ticket.status !== 'closed' && (
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" />
                                تعيين فني
                            </h3>

                            {/* Smart Recommendation */}
                            <TechnicianRecommendation
                                branchLat={ticket.branch?.location_lat || null}
                                branchLng={ticket.branch?.location_lng || null}
                                selectedTechId={selectedTech}
                                onSelect={setSelectedTech}
                            />

                            <button
                                onClick={() => setShowDispatchMap(true)}
                                className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <MapPin className="w-4 h-4" />
                                فتح خريطة التوجيه
                            </button>

                            <button
                                onClick={handleAssignTechnician}
                                disabled={!selectedTech || isAssigning}
                                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                تأكيد التعيين
                            </button>
                        </div>
                    )}

                    {/* Dispatch Map Modal */}
                    {showDispatchMap && (
                        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                            <div className="bg-white w-full max-w-5xl h-[85vh] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden animate-in fade-in zoom-in duration-200">
                                <button
                                    onClick={() => setShowDispatchMap(false)}
                                    className="absolute top-4 right-4 z-[2010] bg-white text-slate-500 hover:text-red-500 p-2 rounded-full shadow-md transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>

                                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-[2005]">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">خريطة التوجيه الذكي</h3>
                                        <p className="text-sm text-slate-500">
                                            {ticket.branch?.name_ar} ({ticket.branch?.city})
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 bg-slate-50 relative">
                                    <TechnicianMap
                                        targetLocation={
                                            ticket.branch?.location_lat && ticket.branch?.location_lng
                                                ? {
                                                    lat: ticket.branch.location_lat,
                                                    lng: ticket.branch.location_lng,
                                                    label: ticket.branch.name_ar
                                                }
                                                : null
                                        }
                                        className="h-full w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Ticket ID & History */}
                    <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl space-y-6 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">البيانات الفنية</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">رقم البلاغ</span>
                                    <span className="font-mono font-bold">#{ticket.id.slice(0, 8)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">المبلغ عنه في</span>
                                    <span>{new Date(ticket.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                {ticket.technician_id && (
                                    <div className="pt-4 border-t border-white/10 mt-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                            <User className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400">الفني المعني</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold">{ticket.technician?.full_name || 'غير معروف'}</p>
                                                {ticket.technician_id && (
                                                    <button
                                                        onClick={async () => {
                                                            const { data: profileData } = await supabase.from('profiles').select('phone').eq('id', ticket.technician_id as string).single();
                                                            handleWhatsApp(profileData ? (profileData as { phone: string | null }).phone : null, 'technician');
                                                        }}
                                                        className="p-2.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 active:scale-90 transition-all"
                                                        title="واتساب الفني"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="absolute top-[-20%] left-[-20%] w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                    </div>
                </div>
            </div>
            {/* Close Ticket Modal */}
            {showCloseModal && ticket && (
                <CloseTicketModal
                    ticketId={ticket.id}
                    categoryId={ticket.category_id || ''}
                    onClose={() => setShowCloseModal(false)}
                    onSuccess={() => {
                        setShowCloseModal(false);
                        fetchTicketDetails();
                    }}
                />
            )}
            {/* Handover Approval Modal */}
            {showHandoverModal && ticket && (
                <HandoverApprovalModal
                    ticketId={ticket.id}
                    onClose={() => setShowHandoverModal(false)}
                    onSuccess={() => {
                        setShowHandoverModal(false);
                        fetchTicketDetails();
                    }}
                />
            )}
            {/* Asset History Drawer */}
            {ticket && ticket.asset_id && (
                <AssetHistoryDrawer
                    isOpen={showHistoryDrawer}
                    onClose={() => setShowHistoryDrawer(false)}
                    assetId={ticket.asset_id}
                    assetName={ticket.maintenance_assets?.name || 'معدة غير معروفة'}
                />
            )}
            {/* Floating Action Buttons (Mobile) */}
            <div className="fixed bottom-6 left-6 flex flex-col gap-3 lg:hidden z-40">
                {userProfile?.role === 'technician' && ticket.status !== 'closed' && (
                    <>
                        {ticket.status === 'open' ? (
                            <button
                                onClick={() => updateStatus('in_progress')}
                                disabled={actionLoading}
                                className="w-14 h-14 bg-blue-600 rounded-full shadow-lg shadow-blue-300 text-white flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6 fill-current" />}
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowCloseModal(true)}
                                className="w-14 h-14 bg-emerald-600 rounded-full shadow-lg shadow-emerald-300 text-white flex items-center justify-center hover:scale-110 transition-transform"
                            >
                                <CheckCircle2 className="w-6 h-6" />
                            </button>
                        )}
                    </>
                )}

                {ticket.branch.google_map_link && (
                    <a
                        href={ticket.branch.google_map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-14 h-14 bg-white rounded-full shadow-lg text-slate-600 flex items-center justify-center hover:scale-110 transition-transform border border-slate-100"
                    >
                        <MapPin className="w-6 h-6" />
                    </a>
                )}
            </div>
        </div>
    );
};

export default TicketDetails;
