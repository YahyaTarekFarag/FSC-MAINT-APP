import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Save, Shield, AlertTriangle, Clock, Activity, ToggleLeft, ToggleRight, Loader2, Layout, MapPin
} from 'lucide-react';
import { logActivity } from '../../../lib/api';
import CategoriesManager from './CategoriesManager';
import SLAManager from './SLAManager';

interface SystemConfig {
    maintenance_mode: boolean;
    auto_assign: boolean;
    require_photos: boolean;
    stock_alert_threshold: number;
    geofencing_enabled: boolean;
}

const SystemSettings = () => {
    const [config, setConfig] = useState<SystemConfig>({
        maintenance_mode: false,
        require_photos: true,
        auto_assign: true,
        stock_alert_threshold: 10,
        geofencing_enabled: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'categories' | 'sla'>('general');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        const { data } = await supabase.from('system_config').select('*');
        if (data) {
            const configMap: Record<string, string | number | boolean> = {};
            data.forEach((row) => configMap[row.key] = row.value);
            setConfig(prev => ({ ...prev, ...configMap }));
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates = Object.entries(config).map(([key, value]) => ({
                key,
                value,
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase.from('system_config').upsert(updates);
            if (error) throw error;

            await logActivity('UPDATE', 'System Settings', { action: 'Updated system configuration' });
            alert('تم حفظ الإعدادات بنجاح');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-full min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">إعدادات النظام</h1>
                    <p className="text-slate-500">التحكم الكامل في متغيرات وخصائص التطبيق</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 mb-6">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <SettingsIcon active={activeTab === 'general'} />
                        الإعدادات العامة
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-4 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'categories' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Layout className="w-4 h-4" />
                        التصنيفات
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('sla')}
                    className={`px-4 py-3 font-bold text-sm transition-colors border-b-2 ${activeTab === 'sla' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        اتفاقية الخدمة (SLA)
                    </div>
                </button>
            </div>

            {activeTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                    {/* Maintenance Mode Card */}
                    <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 opacity-50 pointer-events-none" />

                        <div className="flex items-start gap-4 mb-6 relative">
                            <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">وضع الصيانة</h3>
                                <p className="text-sm text-slate-500 mt-1">يعطل دخول المستخدمين العاديين للنظام مؤقتاً</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-red-50/50 p-4 rounded-xl border border-red-100">
                            <span className="font-bold text-slate-700">تفعيل وضع الصيانة</span>
                            <button
                                onClick={() => setConfig({ ...config, maintenance_mode: !config.maintenance_mode })}
                                className={`text-2xl transition-colors ${config.maintenance_mode ? 'text-red-500' : 'text-slate-300'}`}
                            >
                                {config.maintenance_mode ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                            </button>
                        </div>
                    </div>

                    {/* Automation Settings */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">الأتمتة والسياسات</h3>
                                <p className="text-sm text-slate-500 mt-1">قواعد سير العمل التلقائية</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                <div>
                                    <h4 className="font-bold text-slate-800">التعيين التلقائي (Auto-Assign)</h4>
                                    <p className="text-xs text-slate-500">تعيين الفني تلقائياً بناءً على المنطقة الجغرافية</p>
                                </div>
                                <button
                                    onClick={() => setConfig({ ...config, auto_assign: !config.auto_assign })}
                                    className={`text-2xl transition-colors ${config.auto_assign ? 'text-blue-600' : 'text-slate-300'}`}
                                >
                                    {config.auto_assign ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                <div>
                                    <h4 className="font-bold text-slate-800">إلزامية الصور (Required Photos)</h4>
                                    <p className="text-xs text-slate-500">طلب صورة إجبارية عند إغلاق البلاغ</p>
                                </div>
                                <button
                                    onClick={() => setConfig({ ...config, require_photos: !config.require_photos })}
                                    className={`text-2xl transition-colors ${config.require_photos ? 'text-blue-600' : 'text-slate-300'}`}
                                >
                                    {config.require_photos ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                            <div>
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-500" />
                                    التحقق الجغرافي (Geofencing)
                                </h4>
                                <p className="text-xs text-slate-500">إلزام الموظف بالتواجد في نطاق 200 متر من الموقع</p>
                            </div>
                            <button
                                onClick={() => setConfig({ ...config, geofencing_enabled: !config.geofencing_enabled })}
                                className={`text-2xl transition-colors ${config.geofencing_enabled ? 'text-blue-600' : 'text-slate-300'}`}
                            >
                                {config.geofencing_enabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                            </button>
                        </div>
                    </div>


                    {/* Inventory Alerts */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">تنبيهات المخزون</h3>
                                <p className="text-sm text-slate-500 mt-1">الحدود الدنيا للتنبيهات</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 max-w-sm">
                            <label className="font-bold text-slate-700 whitespace-nowrap">حد التحذير العام:</label>
                            <input
                                type="number"
                                value={config.stock_alert_threshold}
                                onChange={(e) => setConfig({ ...config, stock_alert_threshold: parseInt(e.target.value) })}
                                className="w-24 p-2 rounded-lg border border-slate-300 text-center font-bold"
                            />
                            <span className="text-slate-500 text-sm">قطعة</span>
                        </div>
                    </div>

                    <div className="lg:col-span-2 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            حفظ الإعدادات
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'categories' && <CategoriesManager />}

            {activeTab === 'sla' && <SLAManager />}
        </div >
    );
};

const SettingsIcon = ({ active }: { active: boolean }) => (
    <svg className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-500'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

export default SystemSettings;
