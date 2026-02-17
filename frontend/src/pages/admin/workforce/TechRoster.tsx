import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Loader2, MapPin, Briefcase, Search,
    Phone, MoreHorizontal, ArrowRightLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface Ticket {
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
    branch?: { name_ar: string };
    title?: string; // Requires fetch
    description?: string;
    fault_category?: string;
}

interface Technician {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: string;
    status: 'active' | 'suspended';
    last_activity_at: string | null;
    current_work_lat: number;
    current_work_lng: number;
    assigned_area?: { name_ar: string };
    assigned_sector?: { name_ar: string };
    tickets?: Ticket[];
    // Computed
    computedStatus?: 'busy' | 'online' | 'offline';
    weeklyPerformance?: number;
}

export default function TechRoster() {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchTechnicians();

        const channel = supabase
            .channel('tech-roster')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => fetchTechnicians() // Refresh on profile change
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'tickets' },
                () => fetchTechnicians() // Refresh on ticket change
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchTechnicians = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    assigned_area:areas(name_ar),
                    assigned_sector:sectors(name_ar),
                    tickets(
                        id,
                        status,
                        created_at,
                        updated_at,
                        description,
                        fault_category,
                        branch:branches(name_ar)
                    )
                `)
                .eq('role', 'technician')
                .order('full_name');

            if (error) throw error;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const processed = (data || []).map((tech: any) => {
                const tickets = tech.tickets || [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const activeTicket = tickets.find((t: any) => t.status === 'in_progress');

                // 1. Calculate Status
                let status: 'busy' | 'online' | 'offline' = 'offline';
                const lastActivity = tech.last_activity_at ? new Date(tech.last_activity_at).getTime() : 0;
                const hoursSinceActivity = (Date.now() - lastActivity) / (1000 * 60 * 60);

                if (activeTicket) {
                    status = 'busy';
                } else if (hoursSinceActivity < 24) {
                    status = 'online';
                }

                // 2. Calculate Weekly Performance (Closed tickets in last 7 days)
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const weeklyClosed = tickets.filter((t: any) =>
                    t.status === 'closed' && new Date(t.updated_at) > oneWeekAgo
                ).length;

                return {
                    ...tech,
                    computedStatus: status,
                    weeklyPerformance: weeklyClosed,
                    tickets // Keep raw tickets for logic
                };
            });

            setTechnicians(processed);
        } catch (err) {
            console.error('Error fetching techs:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredTechs = technicians.filter(t => {
        const matchesSearch = t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            t.phone?.includes(search) ||
            t.assigned_area?.name_ar.includes(search);
        const matchesStatus = filterStatus === 'all' || t.computedStatus === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) return (
        <div className="flex justify-center items-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">وحدة مراقبة الفنيين</h1>
                    <p className="text-slate-500">متابعة الأداء والنشاط والمهام الحالية للفريق</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="بحث (اسم، هاتف، منطقة)..."
                            className="pr-9 pl-3 py-2 border border-slate-200 rounded-xl w-full md:w-64 focus:outline-none focus:border-blue-500 transition-colors"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="border border-slate-200 rounded-xl px-3 py-2 bg-white outline-none focus:border-blue-500 font-bold text-sm"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                    >
                        <option value="all">كل الحالات</option>
                        <option value="busy">مشغول بأعمال (Busy)</option>
                        <option value="online">متاح (Online)</option>
                        <option value="offline">غير نشط (Offline)</option>
                    </select>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTechs.map(tech => {
                    const activeTicket = tech.tickets?.find(t => t.status === 'in_progress');

                    return (
                        <div key={tech.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                            {/* Status Header */}
                            <div className={`h-2 w-full ${tech.computedStatus === 'busy' ? 'bg-red-500' :
                                    tech.computedStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                                }`} />

                            <div className="p-5">
                                {/* Profile & Info */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg border-2 border-white shadow-sm">
                                                {tech.full_name?.charAt(0)}
                                            </div>
                                            <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${tech.computedStatus === 'busy' ? 'bg-red-500' :
                                                    tech.computedStatus === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                                                }`} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 truncate max-w-[140px]">{tech.full_name}</h3>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                                <Briefcase className="w-3 h-3" />
                                                <span>{tech.assigned_area?.name_ar || 'غير معين'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-1">
                                        {tech.phone && (
                                            <a
                                                href={`tel:${tech.phone}`}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-green-50 hover:text-green-600 transition-colors"
                                                title="اتصال"
                                            >
                                                <Phone className="w-4 h-4" />
                                            </a>
                                        )}
                                        <Link
                                            to={`/admin/tickets?tech=${tech.id}`}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                            title="المهام"
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>

                                {/* Active Task Section */}
                                <div className="mb-4">
                                    {activeTicket ? (
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    يعمل الآن
                                                </span>
                                                <span className="text-[10px] text-red-400">
                                                    #{activeTicket.id.slice(0, 5)}
                                                </span>
                                            </div>
                                            <div className="font-bold text-red-900 text-sm truncate mb-1">
                                                {activeTicket.fault_category} - {activeTicket.description?.slice(0, 20)}...
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-red-700/80">
                                                <MapPin className="w-3 h-3" />
                                                <span className="truncate">{activeTicket.branch?.name_ar || 'الفرع'}</span>
                                            </div>

                                            <Link
                                                to={`/tickets/${activeTicket.id}`}
                                                className="mt-2 text-xs w-full block text-center bg-white/60 hover:bg-white text-red-700 py-1 rounded-lg transition-colors font-bold"
                                            >
                                                عرض التفاصيل
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                                            <div className="text-emerald-600 font-bold text-sm mb-1">
                                                {tech.computedStatus === 'online' ? 'متاح للعمل' : 'غير متواجد'}
                                            </div>
                                            <p className="text-xs text-emerald-600/70">
                                                لا توجد مهام نشطة حالياً
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Performance Mini-Chart */}
                                <div className="border-t border-slate-100 pt-3">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase">إنجاز الأسبوع</span>
                                        <span className="text-xs font-bold text-slate-700">{tech.weeklyPerformance} بلاغ</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-blue-500 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${Math.min((tech.weeklyPerformance || 0) * 10, 100)}%` }}
                                        />
                                    </div>
                                </div>

                            </div>

                            {/* Reassign Button Footer */}
                            {activeTicket && (
                                <div className="bg-slate-50 p-2 border-t border-slate-100 flex justify-center">
                                    <Link
                                        to={`/tickets/${activeTicket.id}`}
                                        className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                    >
                                        <ArrowRightLeft className="w-3 h-3" />
                                        إعادة تعيين المهمة
                                    </Link>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {filteredTechs.length === 0 && (
                <div className="text-center py-12">
                    <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-600">لا يوجد فنيين مطابقين</h3>
                    <p className="text-slate-400">جرب تغيير حالة التصفية أو البحث باسم آخر</p>
                </div>
            )}
        </div>
    );
}
