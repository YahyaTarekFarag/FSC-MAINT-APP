import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { generateExcelReport } from '../../lib/reports';
import {
    FileSpreadsheet,
    Filter,
    Search,
    TrendingUp,
    DollarSign,
    CheckCircle2,
    Clock,
    Building2,
    Loader2
} from 'lucide-react';

interface ReportTicket {
    id: string;
    ticket_number: number;
    created_at: string;
    closed_at: string | null;
    status: string;
    priority: string;
    repair_cost: number;
    description: string;
    branch: { name_ar: string } | null;
    category: { name_ar: string } | null;
    technician: { full_name: string } | null;
}

const ReportsPage = () => {
    const [loading, setLoading] = useState(false);
    const [tickets, setTickets] = useState<ReportTicket[]>([]);
    const [branches, setBranches] = useState<{ id: string; name_ar: string }[]>([]);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');

    // KPIs
    const [stats, setStats] = useState({
        totalTickets: 0,
        totalCost: 0,
        closedTickets: 0,
        openTickets: 0
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, name_ar');
        if (data) setBranches(data);
    };

    const handleGenerateReport = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('tickets')
                .select(`
                    *,
                    branch:branches(name_ar),
                    category:fault_categories(name_ar),
                    technician:profiles!tickets_technician_id_fkey(full_name)
                `)
                .order('created_at', { ascending: false });

            if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`);
            if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`);
            if (selectedBranch !== 'all') query = query.eq('branch_id', selectedBranch);
            if (selectedStatus !== 'all') query = query.eq('status', selectedStatus);

            const { data, error } = await query;

            if (error) throw error;

            // Cast data to ReportTicket[] as supabase types might vary slightly with joins
            const typedData = (data || []) as unknown as ReportTicket[];
            setTickets(typedData);
            calculateStats(typedData);
        } catch (err) {
            console.error('Error generating report:', err);
            alert('حدث خطأ أثناء إنشاء التقرير');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: ReportTicket[]) => {
        const closed = data.filter(t => t.status === 'closed');
        const totalCost = closed.reduce((sum, t) => sum + (t.repair_cost || 0), 0);

        setStats({
            totalTickets: data.length,
            totalCost,
            closedTickets: closed.length,
            openTickets: data.length - closed.length
        });
    };

    const handleExport = () => {
        if (tickets.length === 0) return;
        generateExcelReport(tickets);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-8 font-sans" dir="rtl">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-1">التقارير المتقدمة</h1>
                    <p className="text-slate-500">استخراج وتحليل بيانات الصيانة والتكاليف</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={tickets.length === 0}
                    className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FileSpreadsheet className="w-5 h-5" />
                    تصدير Excel
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">من تاريخ</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">إلى تاريخ</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">الفرع</label>
                        <div className="relative">
                            <Building2 className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all appearance-none"
                            >
                                <option value="all">كل الفروع</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name_ar}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">الحالة</label>
                        <div className="relative">
                            <Filter className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all appearance-none"
                            >
                                <option value="all">الكل</option>
                                <option value="open">مفتوح</option>
                                <option value="in_progress">جاري العمل</option>
                                <option value="closed">مغلق</option>
                            </select>
                        </div>
                    </div>
                    <button
                        onClick={handleGenerateReport}
                        disabled={loading}
                        className="bg-blue-600 text-white p-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        عرض النتائج
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold">إجمالي البلاغات</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stats.totalTickets}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold">إجمالي التكلفة</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stats.totalCost.toLocaleString()} ج.م</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold">بلاغات مغلقة</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stats.closedTickets}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-bold">بلاغات نشطة</p>
                        <h3 className="text-2xl font-bold text-slate-900">{stats.openTickets}</h3>
                    </div>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-4">#</th>
                                <th className="p-4">التاريخ</th>
                                <th className="p-4">الفرع</th>
                                <th className="p-4">التصنيف</th>
                                <th className="p-4">الفني المسؤول</th>
                                <th className="p-4">الحالة</th>
                                <th className="p-4">التكلفة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tickets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                                        لا توجد بيانات للعرض. قم باختيار معايير البحث واضغط على "عرض النتائج"
                                    </td>
                                </tr>
                            ) : (
                                tickets.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-mono font-bold text-slate-600">#{t.ticket_number}</td>
                                        <td className="p-4 text-slate-600">{new Date(t.created_at).toLocaleDateString('ar-EG')}</td>
                                        <td className="p-4 font-bold text-slate-800">{t.branch?.name_ar}</td>
                                        <td className="p-4">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                                                {t.category?.name_ar || 'عام'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-600">{t.technician?.full_name || '-'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'closed' ? 'bg-green-50 text-green-600' :
                                                t.status === 'open' ? 'bg-blue-50 text-blue-600' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                {t.status === 'closed' ? 'مغلق' : t.status === 'open' ? 'مفتوح' : 'جاري العمل'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-slate-900">
                                            {t.repair_cost ? `${t.repair_cost.toLocaleString()} ج.م` : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
