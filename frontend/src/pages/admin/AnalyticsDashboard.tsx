import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useUISchema } from '../../hooks/useUISchema';
import { SovereignChart } from '../../components/analytics/SovereignChart';
import type { WidgetConfig } from '../../components/analytics/SovereignChart';
import { Loader2, RefreshCw, BarChart3, Bell, Clock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface TicketLog {
    id: string;
    status: string;
    fault_category: string;
    created_at: string;
    branches?: {
        name_ar: string;
    };
}

export default function AnalyticsDashboard() {
    const { schema, loading: schemaLoading } = useUISchema('dashboard_analytics_v1');
    const [widgetData, setWidgetData] = useState<Record<string, Record<string, any>[]>>({});
    const [dataLoading, setDataLoading] = useState(true);
    const [strategy, setStrategy] = useState<'operational' | 'financial'>('operational');
    const [recentLogs, setRecentLogs] = useState<TicketLog[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!schema?.widgets) return;

        setDataLoading(true);
        try {
            const widgets = schema.widgets as WidgetConfig[];
            const dataMap: Record<string, Record<string, any>[]> = {};

            // Fetch data for each unique view
            const uniqueViews = Array.from(new Set(widgets.map(w => w.view).filter((v): v is string => !!v)));

            await Promise.all(uniqueViews.map(async (viewName) => {
                const { data, error } = await supabase
                    .from(viewName)
                    .select('*');

                if (error) {
                    console.error(`Error fetching view ${viewName}:`, error);
                } else {
                    dataMap[viewName] = data || [];
                }
            }));

            setWidgetData(dataMap);

            // Fetch recent tickets for live feed
            const { data: tickets } = await supabase
                .from('tickets')
                .select('*, branches(name_ar)')
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentLogs(tickets || []);

        } catch (err) {
            console.error('Analytics Fetch Error:', err);
            toast.error('فشل تحميل بيانات التحليلات');
        } finally {
            setDataLoading(false);
        }
    }, [schema?.widgets]);

    useEffect(() => {
        if (schema?.widgets) {
            fetchData();
        }
    }, [schema?.widgets, fetchData]);

    if (schemaLoading || (dataLoading && Object.keys(widgetData).length === 0)) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse" />
                    <Loader2 className="w-16 h-16 animate-spin text-blue-500 relative z-10" />
                </div>
                <h2 className="text-white font-black text-xl mt-8">جاري استدعاء البيانات السيادية...</h2>
                <p className="text-white/20 text-sm font-bold uppercase tracking-[0.2em] mt-2">The All-Seeing Eye is opening</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black p-6 lg:p-12 font-sans rtl" dir="rtl">
            <header className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                <div className="relative group">
                    <div className="absolute -inset-4 bg-blue-600/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-6 relative">
                        <div className="p-4 bg-blue-600 rounded-[1.5rem] shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                            <BarChart3 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-white text-4xl md:text-5xl font-black tracking-tight leading-tight">
                                {schema?.title || 'التحليلات السيادية'}
                            </h1>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <p className="text-white/40 font-bold uppercase tracking-[0.3em] text-[10px]">Active Strategic Monitoring</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                        <button
                            onClick={() => setStrategy('operational')}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${strategy === 'operational' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            تشغيلي
                        </button>
                        <button
                            onClick={() => setStrategy('financial')}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${strategy === 'financial' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                        >
                            مالي
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={async () => {
                                setIsSyncing(true);
                                try {
                                    const { data, error } = await supabase.rpc('generate_scheduled_tickets');
                                    if (error) throw error;
                                    toast.success(`تم توليد ${data} بلاغ صيانة وقائية`);
                                    fetchData();
                                } catch {
                                    toast.error('فشل تشغيل محرك الصيانة الوقائية');
                                } finally {
                                    setIsSyncing(false);
                                }
                            }}
                            className="bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 px-4 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Zap className={`w-5 h-5 ${isSyncing ? 'animate-bounce' : ''}`} />
                            <span className="hidden md:inline">تشغيل المحرك</span>
                        </button>

                        <div className="px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl">
                            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Last Sync</p>
                            <p className="text-white font-mono text-sm">{new Date().toLocaleTimeString('ar-EG')}</p>
                        </div>
                        <button
                            onClick={fetchData}
                            className="p-5 bg-blue-600 border border-blue-400/30 rounded-2xl text-white hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all active:scale-95 group"
                        >
                            <RefreshCw className={`w-6 h-6 ${dataLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
                <main className="lg:col-span-9">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
                        {schema?.widgets?.filter((w: WidgetConfig) => {
                            if (strategy === 'financial') return w.id.includes('spending') || w.id.includes('valuation') || w.id.includes('cost');
                            return !w.id.includes('spending') && !w.id.includes('valuation');
                        }).map((widget: WidgetConfig) => {
                            const isKPI = widget.type === 'kpi_card';
                            const colSpan = isKPI ? 'lg:col-span-4' : 'lg:col-span-6';

                            return (
                                <div key={widget.id} className={`${colSpan} animate-in fade-in slide-in-from-bottom-8 duration-700`}>
                                    <SovereignChart
                                        config={widget}
                                        data={widgetData[widget.view || ''] || []}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </main>

                <aside className="lg:col-span-3 space-y-8 animate-in fade-in slide-in-from-left-8 duration-1000">
                    <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 h-full min-h-[600px] flex flex-col">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="p-3 bg-emerald-500/20 rounded-xl">
                                <Bell className="w-5 h-5 text-emerald-400" />
                            </div>
                            <h2 className="text-white font-black text-xl tracking-tight">البث المباشر</h2>
                        </div>

                        <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                            {recentLogs.length > 0 ? recentLogs.map((log: TicketLog) => (
                                <div key={log.id} className="p-5 bg-white/5 border border-white/10 rounded-2xl group hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-2 h-2 rounded-full ${log.status === 'open' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                        <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{log.status}</span>
                                    </div>
                                    <p className="text-white text-sm font-bold leading-relaxed">
                                        بلاع جديد في {log.branches?.name_ar || 'فرع غير معروف'}: {log.fault_category}
                                    </p>
                                    <div className="mt-3 flex items-center gap-2 text-white/20 text-[10px] font-black uppercase">
                                        <Clock className="w-3 h-3" />
                                        <span>{new Date(log.created_at).toLocaleTimeString('ar-EG')}</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10">
                                    <p className="text-white/20 text-xs font-bold">لا توجد أنشطة حديثة</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                            <p className="text-white/20 text-[10px] font-black uppercase tracking-widest leading-loose">
                                جارى مراقبة النبض السيادي للنظام...
                            </p>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Premium Footer Accent */}
            <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex justify-between items-center opacity-30">
                <p className="text-white text-[10px] font-bold uppercase tracking-widest">Sovereign Architecture V4.0</p>
                <div className="flex gap-4">
                    <div className="w-8 h-1 bg-white/20 rounded-full" />
                    <div className="w-16 h-1 bg-blue-600 rounded-full" />
                    <div className="w-8 h-1 bg-white/20 rounded-full" />
                </div>
            </div>
        </div>
    );
}
