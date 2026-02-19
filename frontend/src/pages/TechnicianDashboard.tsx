import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    MapPin,
    ChevronRight,
    CheckCircle2,
    Play,
    Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';
import { useGeoLocation } from '../hooks/useGeoLocation';
import { useTicketActions } from '../hooks/useTicketActions';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
    branch: { name_ar: string; location_lat?: number; location_lng?: number };
};

export default function TechnicianDashboard({ userProfile }: { userProfile: any }) {
    const navigate = useNavigate();
    const { updateStatus, loadingAction } = useTicketActions();
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [todayTickets, setTodayTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const { getCoordinates } = useGeoLocation();

    useEffect(() => {
        fetchDashboardData();
    }, [userProfile?.id]);

    const fetchDashboardData = async () => {
        if (!userProfile?.id) return;
        setLoading(true);
        try {
            console.log('[Sovereign Debug]: Fetching technician dashboard data');
            // 1. Get Active Ticket (In Progress)
            const { data: active } = await supabase
                .from('tickets')
                .select('*, branch:branches(name_ar, location_lat, location_lng)')
                .eq('technician_id', userProfile.id)
                .eq('status', 'in_progress')
                .maybeSingle();

            setActiveTicket(active as any);

            // 2. Get Today's Assigned Tickets (Open)
            const { data: todayList } = await supabase
                .from('tickets')
                .select('*, branch:branches(name_ar)')
                .eq('technician_id', userProfile.id)
                .eq('status', 'open')
                .order('created_at', { ascending: true });

            setTodayTickets((todayList || []) as any);

        } catch (error) {
            console.error('[Sovereign Debug]: Error fetching tech dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (ticketId: string, status: any) => {
        const success = await updateStatus(ticketId, status);
        if (success) fetchDashboardData();
    };

    const handleQuickAction = (ticketId: string) => {
        navigate(`/tickets/${ticketId}`);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-slate-500 font-bold">جاري تحميل بياناتك السيادية...</p>
        </div>
    );

    return (
        <div className="pb-24 space-y-6">
            {/* Header / Welcome */}
            <div className="bg-slate-900 text-white p-6 rounded-b-[2rem] shadow-xl -mx-4 -mt-4 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-slate-400 text-sm mb-1">مرحباً،</p>
                        <h1 className="text-2xl font-bold">{userProfile?.full_name}</h1>
                    </div>
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center font-bold text-blue-400 border border-slate-700">
                        {userProfile?.full_name?.charAt(0)}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="flex gap-4 mt-6">
                    <div className="bg-slate-800/50 p-3 rounded-2xl flex-1 backdrop-blur-sm border border-white/5">
                        <div className="text-2xl font-bold text-emerald-400">{todayTickets.length}</div>
                        <div className="text-xs text-slate-400">مهام الانتظار</div>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-2xl flex-1 backdrop-blur-sm border border-white/5">
                        <div className="text-2xl font-bold text-blue-400">
                            {activeTicket ? 1 : 0}
                        </div>
                        <div className="text-xs text-slate-400">قيد التنفيذ</div>
                    </div>
                </div>
            </div>

            <div className="px-4 space-y-6">
                {/* Active Job Card */}
                {activeTicket && (
                    <section>
                        <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Play className="w-5 h-5 text-blue-600 fill-current" />
                            المهمة الحالية
                        </h2>
                        <div
                            onClick={() => handleQuickAction(activeTicket.id)}
                            className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg shadow-blue-200 active:scale-95 transition-transform cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                        #{activeTicket.id.substring(0, 8)}
                                    </span>
                                    <span className="animate-pulse w-3 h-3 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span>
                                </div>

                                <h3 className="text-xl font-bold mb-1">{activeTicket.fault_category}</h3>
                                <p className="text-blue-100 text-sm mb-4 flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {activeTicket.branch.name_ar}
                                </p>

                                <button className="w-full bg-white text-blue-600 py-3 rounded-xl font-bold text-sm shadow-sm hover:scale-[1.02] transition-transform">
                                    متابعة العمل
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* Today's Schedule */}
                <section>
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="font-bold text-slate-800 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-slate-500" />
                            مهام الانتظار
                        </h2>
                    </div>

                    <div className="space-y-3">
                        {todayTickets.length === 0 ? (
                            <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-400 font-bold text-sm">لا توجد مهام معلقة</p>
                            </div>
                        ) : (
                            todayTickets.map(ticket => (
                                <div
                                    key={ticket.id}
                                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 active:bg-slate-50 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0" onClick={() => handleQuickAction(ticket.id)}>
                                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold text-lg shrink-0">
                                            {ticket.priority === 'urgent' ? '🚨' : '🔧'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 truncate">{ticket.fault_category}</h4>
                                            <p className="text-slate-500 text-sm truncate">{ticket.branch.name_ar}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            disabled={!!loadingAction}
                                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(ticket.id, 'in_progress'); }}
                                            className="bg-blue-600 text-white p-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-blue-700 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                        >
                                            {loadingAction === ticket.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                                            بدء
                                        </button>
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
