import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
    X,
    History,
    User,
    Wrench,
    AlertTriangle,
    TrendingDown,
    Calendar,
    ArrowLeft,
    Loader2
} from 'lucide-react';
import { format, differenceInHours, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TicketRecord {
    id: string;
    created_at: string;
    closed_at: string | null;
    status: string;
    description: string;
    repair_cost: number | null;
    form_data: any;
    profiles: { full_name: string } | null;
    inventory_transactions: {
        change_amount: number;
        transaction_type: string;
        spare_parts: { name_ar: string } | null;
    }[];
}

interface AssetHistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    assetId: string;
    assetName: string;
}

export const AssetHistoryDrawer = ({ isOpen, onClose, assetId, assetName }: AssetHistoryDrawerProps) => {
    const [history, setHistory] = useState<TicketRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalTickets: 0,
        recurringWarning: false,
        totalDowntime: 0,
        totalCost: 0,
        mtbf: 0
    });

    const fetchHistory = useCallback(async () => {
        if (!assetId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
                    id, 
                    created_at, 
                    closed_at, 
                    status, 
                    description, 
                    repair_cost, 
                    form_data, 
                    profiles!tickets_technician_id_fkey(full_name),
                    inventory_transactions(
                        change_amount,
                        transaction_type,
                        spare_parts(name_ar)
                    )
                `)
                .eq('asset_id', assetId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedData: TicketRecord[] = (data || []).map((t: any) => ({
                ...t
            }));

            setHistory(mappedData);

            // Calculate Stats
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);

            const recentTickets = mappedData.filter(t => parseISO(t.created_at) > last30Days);

            let downtimeTotal = 0;
            let costTotal = 0;
            mappedData.forEach(t => {
                if (t.closed_at) {
                    downtimeTotal += differenceInHours(parseISO(t.closed_at), parseISO(t.created_at));
                }
                if (t.repair_cost) {
                    costTotal += t.repair_cost;
                }
            });

            // Calculate MTBF (Mean Time Between Failures)
            let mtbf = 0;
            if (mappedData.length > 1) {
                const firstTicket = parseISO(mappedData[mappedData.length - 1].created_at);
                const lastTicket = parseISO(mappedData[0].created_at);
                const daysBetween = (lastTicket.getTime() - firstTicket.getTime()) / (1000 * 60 * 60 * 24);
                mtbf = daysBetween / (mappedData.length - 1);
            }

            setStats({
                totalTickets: mappedData.length,
                recurringWarning: recentTickets.length >= 3,
                totalDowntime: downtimeTotal,
                totalCost: costTotal,
                mtbf: Math.round(mtbf)
            });

        } catch (error) {
            console.error('Error fetching asset history:', error);
        } finally {
            setLoading(false);
        }
    }, [assetId]);

    useEffect(() => {
        if (isOpen && assetId) {
            fetchHistory();
        }
    }, [isOpen, assetId, fetchHistory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-xl bg-white h-screen shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <History className="w-5 h-5 text-blue-600" />
                            <h2 className="text-xl font-black text-slate-800">سجل صيانة الماكينة</h2>
                        </div>
                        <p className="text-slate-500 font-bold">{assetName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Stats Summary */}
                <div className="p-6 bg-slate-50 grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-slate-500 text-xs mb-1">إجمالي البلاغات</div>
                        <div className="text-xl font-black text-slate-900">{stats.totalTickets}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-slate-500 text-xs mb-1">متوسط الوقت بين الأعطال</div>
                        <div className="text-xl font-black text-blue-600">{stats.mtbf} يوم</div>
                    </div>
                    <div className="col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                            <div className="text-slate-500 text-xs mb-1">إجمالي التكلفة</div>
                            <div className="text-xl font-black text-emerald-600">{stats.totalCost.toLocaleString()} ج.م</div>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <TrendingDown className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                    {stats.recurringWarning && (
                        <div className="col-span-2 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                            <div>
                                <div className="text-red-800 font-bold text-sm">تنبيه: أعطال متكررة</div>
                                <div className="text-red-600 text-xs">تم رصد {stats.totalTickets} بلاغات في آخر 30 يوم لهذه الماكينة.</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <Loader2 className="w-10 h-10 text-blue-400 animate-spin mb-3" />
                            <p className="text-slate-400 font-bold">جاري تحميل السجل...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-20">
                            <Wrench className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">لا توجد بلاغات سابقة لهذه الماكينة</p>
                        </div>
                    ) : (
                        <div className="relative border-r-2 border-slate-100 pr-8 mr-2 space-y-10">
                            {history.map((ticket) => (
                                <div key={ticket.id} className="relative">
                                    {/* Dot */}
                                    <div className={`absolute -right-[11px] top-0 w-5 h-5 rounded-full border-4 border-white shadow-sm ${ticket.status === 'closed' ? 'bg-emerald-500' : 'bg-blue-500'
                                        }`} />

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                                <Calendar className="w-3 h-3" />
                                                {format(parseISO(ticket.created_at), 'd MMMM yyyy', { locale: ar })}
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${ticket.status === 'closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {ticket.status === 'closed' ? 'مكتمل' : 'قيد المعالجة'}
                                            </span>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <p className="text-slate-700 font-bold text-sm mb-4 line-clamp-2">
                                                {ticket.description}
                                            </p>

                                            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                                                        <User className="w-3 h-3 text-slate-400" />
                                                    </div>
                                                    <div className="text-[10px]">
                                                        <div className="text-slate-400">الفني</div>
                                                        <div className="text-slate-900 font-bold">{ticket.profiles?.full_name || 'غير محدد'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                                                        <TrendingDown className="w-3 h-3 text-red-400" />
                                                    </div>
                                                    <div className="text-[10px]">
                                                        <div className="text-slate-400">مدة التعطل</div>
                                                        <div className="text-slate-900 font-bold">
                                                            {ticket.closed_at
                                                                ? `${differenceInHours(parseISO(ticket.closed_at), parseISO(ticket.created_at))} ساعة`
                                                                : 'جاري العمل'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {ticket.inventory_transactions && ticket.inventory_transactions.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <div className="text-[10px] text-slate-400 mb-2 font-bold">قطع الغيار المستهلكة:</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {ticket.inventory_transactions
                                                            .filter(it => it.transaction_type === 'consumption')
                                                            .map((it, idx) => (
                                                                <span key={idx} className="bg-white border border-slate-200 text-[10px] px-2 py-1 rounded-lg font-bold text-slate-600">
                                                                    {it.spare_parts?.name_ar} (x{Math.abs(it.change_amount)})
                                                                </span>
                                                            ))}
                                                    </div>
                                                </div>
                                            )}
                                            <a
                                                href={`/tickets/${ticket.id}`}
                                                className="mt-4 flex items-center justify-center gap-2 py-2 bg-white border border-slate-100 rounded-xl text-blue-600 text-[10px] font-black hover:bg-blue-50 transition-all"
                                            >
                                                عرض تفاصيل البلاغ
                                                <ArrowLeft className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                    <div className="text-xs text-slate-400">تاريخ تحديث البيانات</div>
                    <div className="text-xs font-mono">{format(new Date(), 'HH:mm:ss')}</div>
                </div>
            </div>
        </div>
    );
};

export default AssetHistoryDrawer;
