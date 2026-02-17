import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    ClipboardList,
    Search,
    Filter,
    MapPin,
    AlertCircle,
    Clock,
    ChevronLeft,
    Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/supabase';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
    branch: Database['public']['Tables']['branches']['Row'];
};

interface TicketListProps {
    userProfile: Database['public']['Tables']['profiles']['Row'] | null;
}

const ITEMS_PER_PAGE = 20;

const TicketList: React.FC<TicketListProps> = ({ userProfile }) => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const observer = useRef<IntersectionObserver | null>(null);
    const lastTicketElementRef = useCallback((node: HTMLDivElement) => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    // Reset pagination when filters change
    useEffect(() => {
        setTickets([]);
        setPage(0);
        setHasMore(true);
        setLoading(true);
    }, [filterStatus, filterPriority, searchQuery, userProfile]);

    const fetchTickets = useCallback(async () => {
        if (!userProfile) return;

        // If it's first page, we are 'loading', else 'loadingMore'
        const isFirstPage = page === 0;
        if (!isFirstPage) setLoadingMore(true);

        try {
            let query = supabase
                .from('tickets')
                .select('*, branch:branches!inner(*)', { count: 'exact' });

            // 1. Role-based filtering
            if (userProfile.role === 'technician' && userProfile.assigned_area_id) {
                query = query.eq('branches.area_id', userProfile.assigned_area_id);
            }

            // 2. Status filtering
            if (filterStatus !== 'all') {
                query = query.eq('status', filterStatus);
            }

            // 3. Priority filtering
            if (filterPriority !== 'all') {
                query = query.eq('priority', filterPriority);
            }

            // 4. Search Filtering (Server-side if possible, or Client-side mixed)
            // Note: Supabase ILIKE on joined tables can be tricky.
            // For simplicity and performance, we'll apply basic search on description/category
            // If complex search is needed, we might need RPC.
            if (searchQuery) {
                query = query.or(`description.ilike.%${searchQuery}%,fault_category.ilike.%${searchQuery}%`);
            }

            const from = page * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const newTickets = (data as unknown) as Ticket[];

            setTickets(prev => {
                if (isFirstPage) return newTickets;
                // Avoid duplicates just in case
                const existingIds = new Set(prev.map(t => t.id));
                const uniqueNew = newTickets.filter(t => !existingIds.has(t.id));
                return [...prev, ...uniqueNew];
            });

            // Check if we reached the end
            if (count !== null && (from + newTickets.length >= count)) {
                setHasMore(false);
            } else if (newTickets.length < ITEMS_PER_PAGE) {
                setHasMore(false);
            }

        } catch (err) {
            console.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [userProfile, filterStatus, filterPriority, searchQuery, page]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const statusColors: Record<string, string> = {
        open: 'bg-red-50 text-red-600 border-red-100',
        in_progress: 'bg-blue-50 text-blue-600 border-blue-100',
        closed: 'bg-emerald-50 text-emerald-600 border-emerald-100'
    };

    const statusLabels: Record<string, string> = {
        open: 'مفتوح',
        in_progress: 'قيد التنفيذ',
        closed: 'مغلق'
    };

    const priorityColors: Record<string, string> = {
        low: 'bg-slate-50 text-slate-600',
        medium: 'bg-blue-50 text-blue-600',
        high: 'bg-orange-50 text-orange-600',
        urgent: 'bg-rose-50 text-rose-600'
    };

    const priorityLabels: Record<string, string> = {
        low: 'عادي',
        medium: 'متوسط',
        high: 'عاجل',
        urgent: 'طارئ جداً'
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ar-EG', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">سجل البلاغات</h1>
                    <p className="text-slate-500 mt-1">إدارة ومتابعة طلبات الصيانة</p>
                </div>
                <Link
                    to="/tickets/new"
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                    <ClipboardList className="w-5 h-5" />
                    إضافة بلاغ جديد
                </Link>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="بحث في الوصف أو التصنيف..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            // Note: For server-side search, we should probably debounce this.
                            // But keeping it simple for now as per "Step 1" requirements unless performance lags.
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                            >
                                <option value="all">كل الحالات</option>
                                <option value="open">مفتوح</option>
                                <option value="in_progress">قيد التنفيذ</option>
                                <option value="closed">مغلق</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-slate-400" />
                            <select
                                value={filterPriority}
                                onChange={(e) => setFilterPriority(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none"
                            >
                                <option value="all">كل الأولويات</option>
                                <option value="low">عادي</option>
                                <option value="medium">متوسط</option>
                                <option value="high">عاجل</option>
                                <option value="urgent">طارئ جداً</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tickets List */}
            {loading && tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-slate-500 font-medium">جاري تحميل البلاغات...</p>
                </div>
            ) : tickets.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center space-y-4">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ClipboardList className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">لا توجد بلاغات</h3>
                    <p className="text-slate-500">جرب تغيير الفلاتر أو البحث بكلمات أخرى</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tickets.map((ticket, index) => {
                            if (index === tickets.length - 1) {
                                return (
                                    <div key={ticket.id} ref={lastTicketElementRef} className="h-full">
                                        <TicketCard
                                            ticket={ticket}
                                            navigate={navigate}
                                            statusColors={statusColors}
                                            statusLabels={statusLabels}
                                            priorityColors={priorityColors}
                                            priorityLabels={priorityLabels}
                                            formatDate={formatDate}
                                        />
                                    </div>
                                );
                            } else {
                                return (
                                    <div key={ticket.id} className="h-full">
                                        <TicketCard
                                            ticket={ticket}
                                            navigate={navigate}
                                            statusColors={statusColors}
                                            statusLabels={statusLabels}
                                            priorityColors={priorityColors}
                                            priorityLabels={priorityLabels}
                                            formatDate={formatDate}
                                        />
                                    </div>
                                );
                            }
                        })}
                    </div>

                    {loadingMore && (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    )}

                    {!hasMore && tickets.length > 0 && (
                        <div className="text-center text-slate-400 py-4 text-sm font-medium">
                            تم عرض جميع البلاغات
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Sub-component for cleaner render loop
const TicketCard = ({ ticket, navigate, statusColors, statusLabels, priorityColors, priorityLabels, formatDate }: any) => {
    const getSLAStatus = (dueDateStr: string | null, status: string) => {
        if (!dueDateStr || status === 'closed') return null;

        const due = new Date(dueDateStr);
        const now = new Date();
        const diffMs = due.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < 0) {
            return { color: 'text-red-600 bg-red-50 border-red-100', label: 'متأخر', icon: AlertCircle };
        } else if (diffHours < 4) {
            return { color: 'text-amber-600 bg-amber-50 border-amber-100', label: 'قارب الموعد', icon: Clock };
        } else {
            return { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', label: 'في الموعد', icon: Clock };
        }
    };

    const sla = getSLAStatus(ticket.due_date, ticket.status);

    return (
        <div
            onClick={() => navigate(`/tickets/${ticket.id}`)}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-200 transition-all cursor-pointer group flex flex-col h-full relative overflow-visible"
        >
            {sla && (
                <div className={`absolute top-4 left-4 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${sla.color}`}>
                    <sla.icon className="w-3 h-3" />
                    {sla.label}
                </div>
            )}

            <div className="p-6 flex-1 space-y-4">
                <div className="flex items-start justify-between gap-4 mt-2">
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColors[ticket.status]}`}>
                        {statusLabels[ticket.status]}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black border ${priorityColors[ticket.priority]}`}>
                        {priorityLabels[ticket.priority]}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {ticket.fault_category}
                    </h3>
                    <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{ticket.branch?.name_ar}</span>
                    </div>
                </div>

                <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                    {ticket.description || 'لا يوجد وصف للمشكلة'}
                </p>
            </div>

            <div className="p-6 bg-slate-50/50 border-t border-slate-50 rounded-b-3xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(ticket.created_at)}</span>
                </div>
                <div className="bg-white p-2 rounded-xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                    <ChevronLeft className="w-4 h-4" />
                </div>
            </div>
        </div>
    )
};

export default TicketList;
