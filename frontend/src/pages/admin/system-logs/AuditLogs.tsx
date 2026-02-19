import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Clock, Search, FileText, User, X, Loader2, ArrowRight, Shield, Calendar, Terminal, RefreshCw
} from 'lucide-react';

type AuditLog = {
    id: string;
    user_id: string;
    table_name: string;
    record_id: string;
    action_type: string;
    old_data: any;
    new_data: any;
    created_at: string;
    profile?: {
        full_name: string;
    };
};

const AuditLogs = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    *,
                    profile:profiles(full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(150);

            if (error) throw error;
            setLogs(data as AuditLog[]);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getActionColor = (action: string) => {
        switch (action) {
            case 'INSERT': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
            case 'UPDATE': return 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]';
            case 'DELETE': return 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const filteredLogs = logs.filter(log =>
        log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const JsonDiff = ({ oldData, newData }: { oldData: any; newData: any }) => {
        const allKeys = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]));

        return (
            <div className="space-y-3 font-mono text-xs">
                {allKeys.map(key => {
                    const isChanged = JSON.stringify(oldData?.[key]) !== JSON.stringify(newData?.[key]);
                    if (!isChanged) return null;

                    return (
                        <div key={key} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 group/field transition-all hover:bg-white/[0.07]">
                            <div className="text-blue-400 font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                <Terminal className="w-3 h-3" />
                                {key}
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <div className="flex-1 p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400/70 line-through truncate opacity-50 group-hover/field:opacity-100 transition-opacity">
                                    {oldData?.[key] !== undefined ? JSON.stringify(oldData?.[key]) : 'NULL'}
                                </div>
                                <ArrowRight className="hidden md:block w-4 h-4 text-white/20" />
                                <div className="flex-1 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 font-bold truncate">
                                    {newData?.[key] !== undefined ? JSON.stringify(newData?.[key]) : 'NULL'}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {allKeys.every(k => JSON.stringify(oldData?.[k]) === JSON.stringify(newData?.[k])) && (
                    <div className="text-white/20 italic text-center py-6 font-bold uppercase tracking-widest text-[10px]">
                        لا توجد تغييرات هيكلية مكتشفة
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-12 font-sans rtl" dir="rtl">
            {/* Dark background accent */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(37,99,235,0.07),_transparent_50%)] pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto space-y-10">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black text-[10px] uppercase tracking-[0.3em]">
                            <Shield className="w-3 h-3" />
                            مركز الرقابة السيادي v4.0
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter">سجل التدقيق (Audit Hub)</h1>
                        <p className="text-white/40 font-bold text-lg">مراقبة تفصيلية لجميع التغييرات في البني الحسابية السيادية</p>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-5 bg-white/5 border border-white/10 rounded-2xl text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 group"
                    >
                        <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin text-blue-500' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                </header>

                {/* Glassmorphism Filters */}
                <div className="backdrop-blur-3xl bg-white/5 border border-white/10 p-5 rounded-[2.5rem] flex flex-col md:flex-row gap-6 shadow-2xl">
                    <div className="relative flex-1 group">
                        <Search className="w-6 h-6 text-white/20 absolute right-5 top-4 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="بحث في الجداول، المستخدمين، أو نوع العملية..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pr-14 pl-6 py-4 rounded-2xl bg-white/5 border border-white/10 border-white/10 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-white/10 font-black text-lg"
                        />
                    </div>
                    <div className="flex gap-4">
                        <div className="px-6 py-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                            <Terminal className="w-5 h-5 text-blue-500" />
                            <div className="flex flex-col">
                                <span className="text-[10px] text-white/20 font-black uppercase tracking-widest leading-none mb-1">حمولة البيانات</span>
                                <span className="text-white font-black leading-none">{filteredLogs.length} سجل</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sovereign Table Layout */}
                <div className="bg-white/5 backdrop-blur-3xl rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-white/20 font-black text-[10px] uppercase tracking-[0.3em] border-b border-white/5">
                                    <th className="p-8 text-right">المسؤول عن التغيير</th>
                                    <th className="p-8 text-right">نوع العملية</th>
                                    <th className="p-8 text-right">الكيان المتأثر</th>
                                    <th className="p-8 text-right text-center">التوقيت</th>
                                    <th className="p-8 text-center">الإجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading && logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-32 text-center">
                                            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
                                            <p className="text-white/20 mt-6 font-black tracking-widest uppercase text-xs">جاري استدعاء سجلات السيادة...</p>
                                        </td>
                                    </tr>
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-32 text-center">
                                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                                                <X className="w-10 h-10 text-white/10" />
                                            </div>
                                            <p className="text-white/20 font-black tracking-widest uppercase text-xs">لا توجد عمليات مسجلة حالياً</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-white/[0.03] transition-all duration-300 group/row cursor-default">
                                            <td className="p-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 flex items-center justify-center text-blue-400 border border-white/5 shadow-inner font-black transition-all group-hover/row:scale-110 group-hover/row:border-blue-500/50">
                                                        {log.profile?.full_name?.charAt(0) || <User className="w-6 h-6" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-white text-lg tracking-tight group-hover/row:text-blue-400 transition-colors">{log.profile?.full_name || 'سجل آلي'}</span>
                                                        <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">{log.user_id?.slice(0, 13) || 'SYSTEM_CORE'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <span className={`px-5 py-2 rounded-full text-[10px] font-black tracking-[0.2em] border transition-all ${getActionColor(log.action_type)}`}>
                                                    {log.action_type}
                                                </span>
                                            </td>
                                            <td className="p-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
                                                    <span className="font-mono text-sm font-black text-white/60 uppercase tracking-widest">{log.table_name}</span>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="flex flex-col items-center gap-1 font-mono">
                                                    <span className="text-sm font-black text-white tracking-widest">{new Date(log.created_at).toLocaleDateString('ar-EG')}</span>
                                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{new Date(log.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="mx-auto w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 hover:text-white hover:border-blue-500/50 hover:bg-blue-500/10 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all active:scale-90"
                                                >
                                                    <FileText className="w-6 h-6" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Details Modal - Sovereign Design */}
            {selectedLog && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-900 rounded-[3.5rem] w-full max-w-4xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-blue-600 rounded-[1.5rem] shadow-2xl shadow-blue-500/40">
                                    <Shield className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-black text-3xl text-white tracking-tight">تحليل التغيير السيادي</h3>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">
                                        <span>Log ID: {selectedLog.id}</span>
                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                        <span className="text-blue-400">{selectedLog.table_name}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="w-12 h-12 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 rounded-2xl transition-all text-white/20 bg-white/5"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-10 max-h-[75vh] overflow-y-auto space-y-10 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 space-y-2">
                                    <div className="text-[10px] text-white/20 font-black uppercase tracking-widest flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-blue-500" />
                                        التوقيت الزمني
                                    </div>
                                    <div className="font-black text-white text-lg">
                                        {new Date(selectedLog.created_at).toLocaleString('ar-EG')}
                                    </div>
                                </div>
                                <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 space-y-2">
                                    <div className="text-[10px] text-white/20 font-black uppercase tracking-widest flex items-center gap-2">
                                        <User className="w-3 h-3 text-emerald-500" />
                                        المنفذ
                                    </div>
                                    <div className="font-black text-white text-lg flex items-center gap-3">
                                        {selectedLog.profile?.full_name || 'توجيه آلي'}
                                    </div>
                                </div>
                                <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 space-y-2">
                                    <div className="text-[10px] text-white/20 font-black uppercase tracking-widest flex items-center gap-2">
                                        <RefreshCw className="w-3 h-3 text-amber-500" />
                                        الإجراء
                                    </div>
                                    <div className="flex items-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black border tracking-widest ${getActionColor(selectedLog.action_type)}`}>
                                            {selectedLog.action_type}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-black text-2xl text-white tracking-tight">تحليل البيانات (Diff Engine)</h4>
                                </div>

                                <div className="bg-black/20 p-8 rounded-[2.5rem] border border-white/5">
                                    <JsonDiff oldData={selectedLog.old_data} newData={selectedLog.new_data} />
                                </div>
                            </div>

                            <div className="space-y-6 pt-6 border-t border-white/5">
                                <h4 className="font-black text-white tracking-tight text-xl">لقطة النظام الكاملة (Raw Payload)</h4>
                                <div className="bg-slate-950 text-slate-400 p-8 rounded-3xl font-mono text-[11px] overflow-hidden group relative border border-white/5" dir="ltr">
                                    <div className="absolute top-6 right-8 text-[9px] text-white/10 font-black uppercase tracking-widest">Universal Record Snapshot</div>
                                    <pre className="overflow-x-auto custom-scrollbar">{JSON.stringify({
                                        table: selectedLog.table_name,
                                        record_id: selectedLog.record_id,
                                        old_state: selectedLog.old_data,
                                        new_state: selectedLog.new_data
                                    }, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditLogs;
