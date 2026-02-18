import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
    ClipboardList,
    Search,
    Filter,
    MapPin,
    AlertCircle,
    Clock,
    ChevronLeft,
    LayoutGrid,
    List as ListIcon,
    Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

import { Skeleton } from '../../components/ui/Skeleton';
import type { Database } from '../../lib/supabase';

type Ticket = Database['public']['Tables']['tickets']['Row'] & {
    branch: Database['public']['Tables']['branches']['Row'];
};

interface TicketListProps {
    userProfile: Database['public']['Tables']['profiles']['Row'] | null;
}

const ITEMS_PER_PAGE = 20;

// Sub-component for cleaner render loop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TicketCard = ({ ticket, navigate, viewMode, statusColors, statusLabels, priorityColors, priorityLabels, formatDate }: any) => {
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
        <Card
            onClick={() => navigate(`/tickets/${ticket.id}`)}
            className={`flex relative overflow-visible group transition-all duration-300 ${viewMode === 'list'
                ? 'flex-row items-center p-4 gap-6'
                : 'flex-col h-full'
                }`}
        >
            {/* SLA Badge - Position depends on view mode */}
            {sla && (
                <div className={`
                    ${viewMode === 'list' ? 'order-last mr-auto' : 'absolute top-4 left-4'}
                    px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border shrink-0 ${sla.color}
                `}>
                    <sla.icon className="w-3 h-3" />
                    {viewMode === 'grid' && sla.label}
                    {viewMode === 'list' && <span className="hidden md:inline">{sla.label}</span>}
                </div>
            )}

            <div className={`flex-1 ${viewMode === 'list' ? 'flex items-center gap-6' : 'p-6 space-y-4'}`}>

                {/* Status & Priority */}
                <div className={`flex items-center gap-2 ${viewMode === 'list' ? 'w-48 shrink-0' : 'mt-2 justify-between'}`}>
                    <Badge className={statusColors[ticket.status]}>
                        {statusLabels[ticket.status]}
                    </Badge>
                    <Badge className={priorityColors[ticket.priority]}>
                        {priorityLabels[ticket.priority]}
                    </Badge>
                </div>

                {/* Content */}
                <div className={`${viewMode === 'list' ? 'flex-1 grid grid-cols-2 gap-4 items-center' : ''}`}>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {ticket.fault_category}
                        </h3>
                        <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{ticket.branch?.name_ar}</span>
                        </div>
                    </div>

                    <p className={`text-slate-600 text-sm leading-relaxed ${viewMode === 'list' ? 'line-clamp-1' : 'line-clamp-3'}`}>
                        {ticket.description || 'لا يوجد وصف للمشكلة'}
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className={`
                ${viewMode === 'list' ? 'w-40 shrink-0 flex justify-end' : 'p-6 bg-slate-50/50 border-t border-slate-50 rounded-b-3xl flex items-center justify-between'}
            `}>
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(ticket.created_at)}</span>
                </div>
                {viewMode === 'grid' && (
                    <div className="bg-white p-2 rounded-xl text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                )}
            </div>
        </Card>
    )
};

const TicketList: React.FC<TicketListProps> = ({ userProfile }) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);

    const [filterStatus, setFilterStatus] = useState<string>(searchParams.get('status') || 'all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
            <Card className="p-6 space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="بحث في الوصف أو التصنيف..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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

                    <div className="flex items-center gap-2 border-r border-slate-200 pr-4 mr-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <ListIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </Card>

            {/* Tickets List */}
            {loading && tickets.length === 0 ? (
                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
                            <div className="flex justify-between">
                                <Skeleton width={80} height={24} className="rounded-full" />
                                <Skeleton width={60} height={24} className="rounded-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton width={150} height={24} />
                                <Skeleton width={100} height={16} />
                            </div>
                            <Skeleton height={60} className="w-full" />
                            <div className="flex justify-between pt-4 border-t border-slate-50">
                                <Skeleton width={100} height={16} />
                                <Skeleton width={24} height={24} variant="circular" />
                            </div>
                        </div>
                    ))}
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
                    <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                        {tickets.map((ticket, index) => {
                            const isLast = index === tickets.length - 1;
                            return (
                                <div key={ticket.id} ref={isLast ? lastTicketElementRef : undefined} className="h-full">
                                    <TicketCard
                                        ticket={ticket}
                                        navigate={navigate}
                                        viewMode={viewMode}
                                        statusColors={statusColors}
                                        statusLabels={statusLabels}
                                        priorityColors={priorityColors}
                                        priorityLabels={priorityLabels}
                                        formatDate={formatDate}
                                    />
                                </div>
                            );
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

export default TicketList;
