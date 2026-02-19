import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    ClipboardList,
    Search,
    Filter,
    Plus,
    Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SovereignTable } from '../../components/tickets/SovereignTable';
import toast from 'react-hot-toast';

export default function TicketList() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('tickets')
                .select('*, branch:branches(name_ar)');

            if (filterStatus !== 'all') {
                query = query.eq('status', filterStatus);
            }

            if (searchQuery) {
                query = query.or(`description.ilike.%${searchQuery}%,fault_category.ilike.%${searchQuery}%`);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (err) {
            console.error('Fetch Error:', err);
            toast.error('فشل تحميل قائمة البلاغات');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, searchQuery]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleAction = (action: string, item: any) => {
        if (action === 'view') navigate(`/tickets/${item.id}`);
        // Handle other actions
    };

    return (
        <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0f172a] to-black p-4 md:p-8 font-sans rtl" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-1000">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-black text-white tracking-tight">سجل البلاغات السيادي</h1>
                        <p className="text-white/40 font-medium">متابعة وإدارة تذاكر الصيانة عبر النظام الموحد</p>
                    </div>
                    <Link
                        to="/tickets/new"
                        className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-900/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                        إضافة بلاغ جديد
                    </Link>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 relative">
                        <input
                            type="text"
                            placeholder="بحث في سجل البيانات..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 pr-14 text-white placeholder:text-white/20 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                        />
                        <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white/20" />
                    </div>
                    <div className="relative">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 text-white appearance-none focus:ring-2 focus:ring-blue-500/50 outline-none"
                        >
                            <option value="all" className="bg-slate-900 text-white">كل الحالات السيادية</option>
                            <option value="open" className="bg-slate-900 text-white">مفتوحة</option>
                            <option value="in_progress" className="bg-slate-900 text-white">قيد التنفيذ</option>
                            <option value="resolved" className="bg-slate-900 text-white">مكتملة</option>
                        </select>
                        <Filter className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 pointer-events-none" />
                    </div>
                </div>

                {/* Table Section */}
                <div className="relative">
                    <SovereignTable
                        schemaKey="ticket_maintenance_v1"
                        data={tickets}
                        loading={loading}
                        onAction={handleAction}
                    />
                </div>
            </div>
        </div>
    );
}
