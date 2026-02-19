import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Clock, User, ArrowLeft, Terminal, Zap } from 'lucide-react';

interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    action_type: string;
    old_data: Record<string, any> | null;
    new_data: Record<string, any> | null;
    user_id: string;
    created_at: string;
    changer_name?: string;
}

export const TicketAuditLog: React.FC<{ recordId: string }> = ({ recordId }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    *,
                    profiles:profiles!inner(full_name)
                `)
                .eq('record_id', recordId)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setLogs((data as any[]).map(item => ({
                    ...item,
                    changer_name: item.profiles?.full_name || 'النظام السيادي'
                })));
            }
            setLoading(false);
        };

        fetchLogs();
    }, [recordId]);

    const formatChangeLabel = (log: AuditLog) => {
        if (log.action_type === 'INSERT') return 'إنشاء البلاغ الأساسي';
        if (log.action_type === 'DELETE') return 'أرشفة البلاغ من النظام';

        const oldData = log.old_data || {};
        const newData = log.new_data || {};

        const fieldNames: Record<string, string> = {
            status: 'الحالة التشغيلية',
            priority: 'أولوية التنفيذ',
            technician_id: 'الفني المعني',
            description: 'وصف العطل',
            fault_category: 'تصنيف المشكلة',
            due_date: 'الموعد المستهدف'
        };

        const changes = Object.keys(newData).filter(key =>
            fieldNames[key] && JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
        );

        if (changes.length === 0) return 'تحديث المعاملات التقنية';
        return `تعديل ${changes.map(k => fieldNames[k]).join('، ')}`;
    };

    if (loading) return (
        <div className="animate-pulse bg-white/5 h-48 rounded-[2.5rem] mt-8 border border-white/10"></div>
    );

    if (logs.length === 0) return null;

    return (
        <div className="bg-white/5 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-8 mt-12 mb-12 overflow-hidden relative">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-[50px] pointer-events-none rounded-full" />

            <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-2xl">
                        <ShieldCheck className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-xl tracking-tight">التسلسل الزمني للسيادة</h3>
                        <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Audit Trail & Integrity Log</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">تغطية كاملة</span>
                </div>
            </div>

            <div className="relative space-y-12 before:absolute before:right-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                {logs.map((log) => (
                    <div key={log.id} className="relative pr-12 group">
                        {/* Timeline Node */}
                        <div className="absolute right-0 top-1.5 w-10 h-10 bg-slate-900 rounded-2xl border-2 border-white/10 flex items-center justify-center z-10 shadow-xl group-hover:border-blue-500/50 transition-all group-hover:scale-110">
                            <Clock className="w-4 h-4 text-white/40 group-hover:text-blue-400 transition-colors" />
                        </div>

                        <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all hover:bg-white/[0.07] shadow-lg">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-white/10 to-transparent rounded-xl flex items-center justify-center text-white/60 font-black border border-white/5 group-hover:border-blue-500/30 transition-all">
                                        {log.changer_name?.charAt(0) || <User className="w-5 h-5" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-black text-sm tracking-tight">{log.changer_name}</span>
                                        <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">{log.user_id.slice(0, 13)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 font-mono bg-black/20 px-4 py-2 rounded-xl border border-white/5">
                                    <span className="text-[10px] text-white/60 font-black">
                                        {new Date(log.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                </div>
                            </div>

                            <p className="text-lg text-white font-bold mb-4 flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                                {formatChangeLabel(log)}
                            </p>

                            {log.action_type === 'UPDATE' && log.new_data && log.old_data && (
                                <div className="space-y-3 mt-6">
                                    {Object.keys(log.new_data).map(key => {
                                        const fieldNames: Record<string, string> = {
                                            status: 'الحالة',
                                            priority: 'الأولوية',
                                            technician_id: 'الفني',
                                            due_date: 'الموعد'
                                        };

                                        const oldVal = (log.old_data as Record<string, any>)[key];
                                        const newVal = (log.new_data as Record<string, any>)[key];

                                        if (fieldNames[key] && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                                            return (
                                                <div key={key} className="flex flex-col md:flex-row md:items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 group/diff">
                                                    <div className="flex items-center gap-2 w-24 flex-shrink-0">
                                                        <Terminal className="w-3 h-3 text-blue-400" />
                                                        <span className="text-[10px] text-white/40 font-black uppercase truncate">{fieldNames[key]}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                                        <span className="px-3 py-1 bg-red-500/10 text-red-400 rounded-lg line-through opacity-50 text-[11px] font-bold truncate">
                                                            {String(oldVal || 'فارغ')}
                                                        </span>
                                                        <ArrowLeft className="w-4 h-4 text-white/20" />
                                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg font-black text-[11px] truncate shadow-lg shadow-emerald-500/5">
                                                            {String(newVal || 'فارغ')}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
