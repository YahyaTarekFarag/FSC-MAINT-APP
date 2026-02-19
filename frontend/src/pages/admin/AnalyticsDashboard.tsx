import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useUISchema } from '../../hooks/useUISchema';
import { SovereignChart } from '../../components/analytics/SovereignChart';
import type { WidgetConfig } from '../../components/analytics/SovereignChart';
import { Loader2, RefreshCw, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnalyticsDashboard() {
    const { schema, loading: schemaLoading } = useUISchema('dashboard_analytics_v1');
    const [widgetData, setWidgetData] = useState<Record<string, any[]>>({});
    const [dataLoading, setDataLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!schema?.widgets) return;

        setDataLoading(true);
        try {
            const widgets = schema.widgets as WidgetConfig[];
            const dataMap: Record<string, any[]> = {};

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

                <div className="flex items-center gap-4">
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
            </header>

            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
                    {schema?.widgets?.map((widget) => {
                        const isKPI = widget.type === 'kpi_card';
                        const colSpan = isKPI ? 'lg:col-span-3' : 'lg:col-span-6';

                        return (
                            <div key={widget.id} className={`${colSpan} animate-in fade-in slide-in-from-bottom-8 duration-700`}>
                                <SovereignChart
                                    config={widget as WidgetConfig}
                                    data={widgetData[widget.view || ''] || []}
                                />
                            </div>
                        );
                    })}
                </div>
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
