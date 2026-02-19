import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    ShieldCheck,
    History,
    User,
    Calendar,
    ArrowRight,
    ArrowLeft,
    Clock,
    Database,
    AlertCircle,
    Search,
    ChevronDown,
    ChevronUp,
    FileText,
    Activity,
    Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    old_data: any;
    new_data: any;
    changed_by: string;
    changed_at: string;
    profile?: {
        full_name: string;
        email: string;
    };
}

export default function AuditLogViewer() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 50;

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data: logsData, error: logsError, count } = await supabase
                .from('audit_logs')
                .select('*', { count: 'exact' })
                .order('changed_at', { ascending: false })
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (logsError) throw logsError;

            setTotalCount(count || 0);
            const typedLogs = (logsData || []) as AuditLog[];
            const userIds = [...new Set(typedLogs.map(l => l.changed_by).filter(Boolean))];

            if (userIds.length > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('id', userIds);

                if (!profilesError && profiles) {
                    const profileMap = Object.fromEntries((profiles as any[]).map(p => [p.id, p]));
                    const enrichedLogs = typedLogs.map(log => ({
                        ...log,
                        profile: log.changed_by ? (profileMap[log.changed_by] as any) : undefined
                    }));
                    setLogs(enrichedLogs);
                } else {
                    setLogs(typedLogs);
                }
            } else {
                setLogs(typedLogs);
            }
        } catch (err) {
            console.error('Audit Fetch Error:', err);
            toast.error('فشل في جلب سجلات الرقابة');
        } finally {
            setLoading(false);
        }
    };

    const renderDiff = (oldData: any, newData: any) => {
        if (!oldData && newData) return <span className="text-emerald-400 font-black">إضافة سجل جديد بالكامل</span>;
        if (oldData && !newData) return <span className="text-red-400 font-black">حذف السجل بالكامل</span>;

        const changes = [];
        const oldObj = oldData || {};
        const newObj = newData || {};
        const allKeys = [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])];

        for (const key of allKeys) {
            if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
                changes.push({
                    key,
                    old: oldObj[key],
                    new: newObj[key]
                });
            }
        }

        return (
            <div className="space-y-4">
                {changes.map(change => (
                    <div key={change.key} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col gap-2">
                        <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">{change.key}</span>
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-lg text-xs font-mono line-through opacity-60">
                                {JSON.stringify(change.old)}
                            </span>
                            <ArrowLeft className="w-4 h-4 text-white/20" />
                            <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg text-xs font-mono font-bold">
                                {JSON.stringify(change.new)}
                            </span>
                        </div>
                    </div>
                ))}
                {changes.length === 0 && <span className="text-white/20 italic">لا توجد تغييرات مرئية في الحقول الأساسية</span>}
            </div>
        );
    };

    const filteredLogs = logs.filter(log =>
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.record_id.includes(searchTerm) ||
        log.profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 rtl pb-20" dir="rtl">
            {/* Header Section */}
            <div className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 opacity-50"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10 w-full">
                    <div className="flex items-center gap-8 flex-1">
                        <button
                            onClick={() => navigate('/admin/console')}
                            className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group"
                        >
                            <ArrowRight className="w-6 h-6 text-white group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="bg-blue-600/20 p-5 rounded-[2rem] border border-blue-500/30">
                            <ShieldCheck className="w-12 h-12 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black text-white tracking-tighter">سجل الرقابة السيادي</h1>
                            <p className="text-white/40 text-xl font-medium mt-2 tracking-wide uppercase">The Immutable Black Box</p>
                        </div>
                    </div>

                    <div className="w-full md:w-96 relative">
                        <Search className="absolute ps-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                        <input
                            type="text"
                            placeholder="بحث في الجداول، السجلات، أو الموظفين..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 ps-14 pe-6 text-white font-bold focus:outline-none focus:border-blue-500 transition-all outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem]">
                    <div className="flex items-center gap-3 text-white/40 mb-3">
                        <Activity className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">إجمالي الحركات</span>
                    </div>
                    <h3 className="text-4xl font-black text-white">{totalCount}</h3>
                </div>
                <div className="bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 p-8 rounded-[2.5rem]">
                    <div className="flex items-center gap-3 text-emerald-400 mb-3">
                        <Clock className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">حركات اليوم</span>
                    </div>
                    <h3 className="text-4xl font-black text-emerald-500">
                        {logs.filter(l => new Date(l.changed_at).toDateString() === new Date().toDateString()).length}
                    </h3>
                </div>
                <div className="bg-yellow-500/10 backdrop-blur-xl border border-yellow-500/20 p-8 rounded-[2.5rem]">
                    <div className="flex items-center gap-3 text-yellow-400 mb-3">
                        <Database className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">أكثر الجداول حركة</span>
                    </div>
                    <h3 className="text-xl font-black text-yellow-500 truncate">
                        {Object.entries(logs.reduce((acc, l) => ({ ...acc, [l.table_name]: (acc[l.table_name] || 0) + 1 }), {} as any))
                            .sort((a, b) => (b[1] as any) - (a[1] as any))[0]?.[0] || '---'}
                    </h3>
                </div>
                <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 p-8 rounded-[2.5rem]">
                    <div className="flex items-center gap-3 text-red-400 mb-3">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">حالات الحذف</span>
                    </div>
                    <h3 className="text-4xl font-black text-red-500">
                        {logs.filter(l => l.action === 'DELETE').length}
                    </h3>
                </div>
            </div>

            {/* Logs Timeline */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-900/40 rounded-[3rem] border border-white/5 animate-pulse">
                        <History className="w-16 h-16 text-blue-500/20 mb-4 animate-spin-slow" />
                        <p className="text-white/20 font-black tracking-widest uppercase">جاري استرجاع سجلات الحقيقة...</p>
                    </div>
                ) : filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                        <div
                            key={log.id}
                            className={`group relative bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden transition-all hover:border-white/20 ${expandedLog === log.id ? 'ring-1 ring-blue-500/50' : ''}`}
                        >
                            <div className="p-8 flex flex-col md:flex-row md:items-center gap-8">
                                {/* Action Icon & Indicator */}
                                <div className="flex items-center gap-6 flex-1">
                                    <div className={`p-4 rounded-2xl ${log.action === 'INSERT' ? 'bg-emerald-500/10 text-emerald-400' :
                                        log.action === 'UPDATE' ? 'bg-blue-500/10 text-blue-400' :
                                            'bg-red-500/10 text-red-400'
                                        }`}>
                                        {log.action === 'INSERT' ? <FileText className="w-6 h-6" /> :
                                            log.action === 'UPDATE' ? <Activity className="w-6 h-6" /> :
                                                <Trash2 className="w-6 h-6" />}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${log.action === 'INSERT' ? 'bg-emerald-500 text-white' :
                                                log.action === 'UPDATE' ? 'bg-blue-600 text-white' :
                                                    'bg-red-600 text-white'
                                                }`}>
                                                {log.action === 'INSERT' ? 'إضافة' : log.action === 'UPDATE' ? 'تعديل' : 'حذف'}
                                            </span>
                                            <span className="text-white/20 font-black text-[10px] tracking-widest uppercase">
                                                Table: <span className="text-white/60">{log.table_name}</span>
                                            </span>
                                        </div>
                                        <h4 className="text-lg font-bold text-white tracking-tight">
                                            سجل ID: <span className="font-mono text-sm opacity-50">{log.record_id}</span>
                                        </h4>
                                    </div>
                                </div>

                                {/* Meta Info */}
                                <div className="flex flex-wrap items-center gap-8 min-w-fit">
                                    <div className="flex items-center gap-3 bg-white/5 px-5 py-3 rounded-2xl border border-white/5">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <User className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-white/30 font-black uppercase">بواسطة</span>
                                            <span className="text-white font-bold text-sm">{log.profile?.full_name || 'System / Unknwon'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-white/5 px-5 py-3 rounded-2xl border border-white/5">
                                        <Calendar className="w-4 h-4 text-white/30" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-white/30 font-black uppercase">التاريخ</span>
                                            <span className="text-white font-bold text-sm">
                                                {new Date(log.changed_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                        className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 group-hover:scale-105"
                                    >
                                        {expandedLog === log.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Details (Intelligent Diff) */}
                            {expandedLog === log.id && (
                                <div className="border-t border-white/5 p-8 bg-black/20 animate-in slide-in-from-top-4 duration-500">
                                    <h5 className="text-[10px] font-black uppercase text-white/20 tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <Activity className="w-3 h-3" />
                                        تفاصيل الحركة (Delta Intelligence)
                                    </h5>
                                    {renderDiff(log.old_data, log.new_data)}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 bg-slate-900/40 rounded-[3rem] border border-white/5">
                        <History className="w-16 h-16 text-white/5 mx-auto mb-4" />
                        <p className="text-white/20 font-black">لا توجد سجلات مطابقة للبحث</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {!loading && totalCount > pageSize && (
                <div className="flex items-center justify-center gap-4 pt-10">
                    <button
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                        className="flex items-center gap-2 bg-slate-900 border border-white/10 px-6 py-3 rounded-2xl text-white font-bold hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                        <ArrowRight className="w-5 h-5" />
                        السابق
                    </button>

                    <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-black">
                        صفحة {page + 1} من {Math.ceil(totalCount / pageSize)}
                    </div>

                    <button
                        disabled={(page + 1) * pageSize >= totalCount}
                        onClick={() => setPage(p => p + 1)}
                        className="flex items-center gap-2 bg-slate-900 border border-white/10 px-6 py-3 rounded-2xl text-white font-bold hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                        التالي
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
