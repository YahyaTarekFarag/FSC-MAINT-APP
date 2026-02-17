import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/supabase';
import { X, Calendar, User, Clock, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
    technician: { full_name: string | null } | null;
};

interface AssetHistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    branchId: string;
    categoryId: string; // Using this as a proxy for "Asset Type"
    currentTicketId: string;
}

const AssetHistoryDrawer: React.FC<AssetHistoryDrawerProps> = ({
    isOpen,
    onClose,
    branchId,
    categoryId,
    currentTicketId
}) => {
    const [history, setHistory] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [recurringCount, setRecurringCount] = useState(0);

    useEffect(() => {
        if (isOpen) {
            const fetchHistory = async () => {
                setLoading(true);
                try {
                    // Fetch last 60 days tickets for this branch+category
                    const sixtyDaysAgo = new Date();
                    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

                    const { data, error } = await supabase
                        .from('tickets')
                        .select('*, technician:technician_id(full_name)')
                        .eq('branch_id', branchId)
                        .eq('fault_category', categoryId)
                        .neq('id', currentTicketId) // Exclude current
                        .order('created_at', { ascending: false })
                        .limit(20);

                    if (error) throw error;

                    const recentTickets = (data as unknown) as Ticket[];
                    setHistory(recentTickets);

                    // Count tickets in last 60 days
                    const recentCount = recentTickets.filter(t => new Date(t.created_at) > sixtyDaysAgo).length;
                    setRecurringCount(recentCount);

                } catch (err) {
                    console.error('Error fetching asset history:', err);
                } finally {
                    setLoading(false);
                }
            };

            fetchHistory();
        }
    }, [isOpen, branchId, categoryId, currentTicketId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">سجل الجهاز</h2>
                        <p className="text-sm text-slate-500">البلاغات السابقة لهذا النوع في الفرع</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Recurrence Warning */}
                {!loading && recurringCount > 3 && (
                    <div className="p-4 bg-amber-50 border-b border-amber-100 flex gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-amber-800">تنبيه: أعطال متكررة!</p>
                            <p className="text-xs text-amber-700 mt-1">
                                هذا الجهاز تعطل {recurringCount} مرات خلال الـ 60 يوماً الماضية. يرجى فحص السبب الجذري.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            <p className="text-sm text-slate-400">جاري تحميل السجل...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-20 opacity-50">
                            <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p className="font-bold text-slate-600">لا يوجد سجل سابق</p>
                            <p className="text-sm text-slate-400">هذا هو أول بلاغ من هذا النوع</p>
                        </div>
                    ) : (
                        <div className="space-y-8 relative before:absolute before:right-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                            {history.map((ticket) => (
                                <div key={ticket.id} className="relative pr-10 group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute right-2 top-2 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 
                                        ${ticket.status === 'closed' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                    />

                                    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border
                                                ${ticket.status === 'closed'
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                {ticket.status === 'closed' ? 'مغلق' : 'مفتوح'}
                                            </span>
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(ticket.created_at).toLocaleDateString('ar-EG')}
                                            </span>
                                        </div>

                                        <p className="text-sm font-bold text-slate-800 mb-2 line-clamp-2">
                                            {ticket.description || 'بدون وصف'}
                                        </p>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <User className="w-3 h-3 text-slate-400" />
                                                </div>
                                                <span className="text-xs text-slate-500">
                                                    {ticket.technician?.full_name || 'غير معين'}
                                                </span>
                                            </div>

                                            <a href={`/tickets/${ticket.id}`} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors">
                                                <ArrowRight className="w-4 h-4 rotate-180" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssetHistoryDrawer;
