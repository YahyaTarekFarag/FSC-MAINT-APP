import React, { useEffect, useState, useCallback } from 'react';
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
    Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/supabase';
import TicketComments from '../../components/tickets/TicketComments';
import CloseTicketModal from '../../components/tickets/CloseTicketModal';
import { useGeoLocation } from '../../hooks/useGeoLocation';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
    branch: Database['public']['Tables']['branches']['Row'];
    form_data?: Record<string, any>;
    category_id?: string; // Ensure this is typed
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
    const { getCoordinates } = useGeoLocation();

    const fetchTicketDetails = useCallback(async () => {
        if (!id) return;
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select('*, branch:branches!inner(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            const ticketData = (data as unknown) as Ticket;
            setTicket(ticketData);

            // Fetch questions if form_data exists
            if (ticketData.form_data && Object.keys(ticketData.form_data).length > 0) {
                const questionIds = Object.keys(ticketData.form_data);
                const { data: questions, error: qError } = await supabase
                    .from('category_questions' as any)
                    .select('id, question_text, field_type')
                    .in('id', questionIds);

                if (!qError && questions) {
                    const map: Record<string, Question> = {};
                    questions.forEach((q: any) => {
                        map[q.id] = q;
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

            const updateData: any = {
                status: newStatus,
                technician_id: userProfile?.id,
                updated_at: new Date().toISOString()
            };

            if (coords) {
                if (newStatus === 'in_progress') {
                    updateData.start_work_lat = coords.latitude;
                    updateData.start_work_lng = coords.longitude;
                } else if (newStatus === 'closed') {
                    updateData.end_work_lat = coords.latitude;
                    updateData.end_work_lng = coords.longitude;
                }
            }

            const { error } = await (supabase
                .from('tickets') as any)
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // Refresh ticket data
            await fetchTicketDetails();
        } catch (err) {
            console.error('Error updating ticket status:', err);
            alert('خطأ في تحديث حالة البلاغ');
        } finally {
            setActionLoading(false);
        }
    };

    const statusConfig = {
        open: { label: 'مفتوح', color: 'bg-red-50 text-red-600 border-red-100', icon: AlertTriangle },
        in_progress: { label: 'قيد التنفيذ', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: Play },
        closed: { label: 'مغلق', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2 }
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

                {/* Quick Actions (Technician) */}
                {userProfile?.role === 'technician' && ticket.status !== 'closed' && (
                    <div className="flex items-center gap-3">
                        {ticket.status === 'open' && (
                            <button
                                disabled={actionLoading}
                                onClick={() => updateStatus('in_progress')}
                                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                                بدء العمل
                            </button>
                        )}
                        {ticket.status === 'in_progress' && (
                            <button
                                disabled={actionLoading}
                                onClick={() => setShowCloseModal(true)}
                                className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                إغلاق البلاغ
                            </button>
                        )}
                    </div>
                )}
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
                                <span className="text-slate-700 font-bold">{ticket.branch.name_ar}</span>
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
                                            <p className="text-sm font-bold">تم الاستلام والمتابعة</p>
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
        </div>
    );
};

export default TicketDetails;
