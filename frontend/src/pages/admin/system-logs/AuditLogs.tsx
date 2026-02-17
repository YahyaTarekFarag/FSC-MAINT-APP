import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Clock, Search, FileText, User, Filter, AlertCircle, X, Loader2
} from 'lucide-react';

type SystemLog = {
    id: number;
    user_id: string;
    action_type: string;
    entity_name: string;
    details: any;
    created_at: string;
    profile?: {
        full_name: string;
    };
};

const AuditLogs = () => {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('system_logs')
                .select(`
                    *,
                    profile:profiles(full_name)
                `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            // Map the joined profile data correctly
            const mappedLogs = data?.map(log => ({
                ...log,
                profile: Array.isArray(log.profile) ? log.profile[0] : log.profile
            })) || [];

            setLogs(mappedLogs);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'bg-green-50 text-green-700 border-green-200';
            case 'UPDATE': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'DELETE': return 'bg-red-50 text-red-700 border-red-200';
            case 'LOGIN': return 'bg-purple-50 text-purple-700 border-purple-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const filteredLogs = logs.filter(log =>
        log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-8 font-sans" dir="rtl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">سجل تدقيق النظام</h1>
                <p className="text-slate-500 text-sm">متابعة جميع العمليات والتغييرات في النظام</p>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="w-5 h-5 text-slate-400 absolute right-3 top-3" />
                    <input
                        type="text"
                        placeholder="بحث في السجلات..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                    />
                </div>
                <button onClick={fetchLogs} className="bg-slate-100 p-2.5 rounded-xl hover:bg-slate-200 transition-colors text-slate-600">
                    <Filter className="w-5 h-5" />
                </button>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                        <tr>
                            <th className="p-4">المستخدم</th>
                            <th className="p-4">نوع الإجراء</th>
                            <th className="p-4">الكيان</th>
                            <th className="p-4">التوقيت</th>
                            <th className="p-4">التفاصيل</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-10 text-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                                </td>
                            </tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-10 text-center text-slate-400">لا توجد سجلات مطابقة</td>
                            </tr>
                        ) : (
                            filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-900">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <User className="w-4 h-4" />
                                            </div>
                                            {log.profile?.full_name || 'مستخدم محذوف'}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${getActionColor(log.action_type)}`}>
                                            {log.action_type}
                                        </span>
                                    </td>
                                    <td className="p-4 font-mono text-xs font-bold text-slate-600">
                                        {log.entity_name}
                                    </td>
                                    <td className="p-4 text-sm text-slate-500 dir-ltr text-right">
                                        {new Date(log.created_at).toLocaleString('ar-EG')}
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
                                        >
                                            <FileText className="w-4 h-4" />
                                            عرض
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-slate-900">تفاصيل السجل #{selectedLog.id}</h3>
                            <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="text-xs text-slate-400 mb-1">المستخدم</div>
                                        <div className="font-bold text-slate-800">{selectedLog.profile?.full_name}</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="text-xs text-slate-400 mb-1">التوقيت</div>
                                        <div className="font-bold text-slate-800 text-sm">{new Date(selectedLog.created_at).toLocaleString('ar-EG')}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm font-bold text-slate-700 mb-2">بيانات التغيير (JSON)</div>
                                    <div className="bg-slate-900 text-slate-50 p-4 rounded-xl font-mono text-xs overflow-x-auto" dir="ltr">
                                        <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                                    </div>
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
