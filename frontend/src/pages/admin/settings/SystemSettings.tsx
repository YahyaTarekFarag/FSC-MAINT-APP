import { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertTriangle, MapPin, Clock, Settings, Type, Shield, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import StatusManager from '../sovereign/StatusManager';
import PermissionMatrix from './PermissionMatrix';
import FormBuilder from './FormBuilder';
import { usePermission } from '../../../hooks/usePermission';
import { useSystemSettings } from '../../../contexts/SystemSettingsContext';

interface SystemSettingsData {
    geofence_config: {
        radius_meters: number;
        technician_visibility_km: number;
    };
    sla_policies: {
        low: number;
        medium: number;
        high: number;
        emergency: number;
    };
}

export default function SystemSettings() {
    const { can } = usePermission();
    const { settings, updateSetting, loading } = useSystemSettings();
    const [activeTab, setActiveTab] = useState('general');
    const [saving, setSaving] = useState(false);

    // Helper to get typed settings from context (which stores raw jsonb)
    const geofenceConfig = settings['geofence_config'] || { radius_meters: 500, technician_visibility_km: 5 };
    const slaPolicies = settings['sla_policies'] || { low: 48, medium: 24, high: 8, emergency: 4 };

    const [localGeofence, setLocalGeofence] = useState(geofenceConfig);
    const [localSLA, setLocalSLA] = useState(slaPolicies);

    // Sync local state when context loads
    useEffect(() => {
        if (!loading) {
            setLocalGeofence(settings['geofence_config'] || { radius_meters: 500, technician_visibility_km: 5 });
            setLocalSLA(settings['sla_policies'] || { low: 48, medium: 24, high: 8, emergency: 4 });
        }
    }, [loading, settings]);

    const handleSaveGeneral = async (data: Partial<SystemSettingsData>) => {
        setSaving(true);
        try {
            if (data.geofence_config) {
                await updateSetting('geofence_config', data.geofence_config);
            }
            if (data.sla_policies) {
                await updateSetting('sla_policies', data.sla_policies);
            }

            toast.success('تم حفظ الإعدادات العامة');
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('فشل الحفظ');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500">جاري تحميل الإعدادات...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-8 font-sans" dir="rtl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">مركز السيادة الإدارية</h1>
                    <p className="text-slate-500 mt-2">التحكم المركزي في سلوك النظام، النماذج، والصلاحيات (Sovereign Engine).</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start mt-6">
                {/* Sidebar Navigation */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">إعدادات النظام</div>
                    <nav className="flex flex-col p-2 space-y-1">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all font-medium ${activeTab === 'general' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Settings className="w-5 h-5" />
                            الإعدادات العامة
                        </button>

                        {can('manage', 'settings') && (
                            <button
                                onClick={() => setActiveTab('workflow')}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all font-medium ${activeTab === 'workflow' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Activity className="w-5 h-5" />
                                سير العمل والحالات
                            </button>
                        )}

                        {can('manage', 'forms') && (
                            <button
                                onClick={() => setActiveTab('forms')}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all font-medium ${activeTab === 'forms' ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Type className="w-5 h-5" />
                                محرك النماذج
                            </button>
                        )}

                        {can('manage', 'users') && (
                            <button
                                onClick={() => setActiveTab('permissions')}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all font-medium ${activeTab === 'permissions' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Shield className="w-5 h-5" />
                                صلاحيات الرتب
                            </button>
                        )}
                    </nav>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3">
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* Geofence Settings */}
                            <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-800">إعدادات النطاق الجغرافي</h2>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <span className="text-sm font-bold text-slate-700">نصف قطر السياج الجغرافي (متر)</span>
                                        <input
                                            type="number"
                                            value={localGeofence.radius_meters}
                                            onChange={(e) => setLocalGeofence({ ...localGeofence, radius_meters: Number(e.target.value) })}
                                            className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-black outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                        <span className="text-sm font-bold text-slate-700">نطاق رؤية الفني (كم)</span>
                                        <input
                                            type="number"
                                            value={localGeofence.technician_visibility_km}
                                            onChange={(e) => setLocalGeofence({ ...localGeofence, technician_visibility_km: Number(e.target.value) })}
                                            className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-black outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SLA Policies */}
                            <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-800">مستويات الخدمة (SLA)</h2>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { key: 'low', label: 'اولوية منخفضة', color: 'bg-slate-100 text-slate-600' },
                                        { key: 'medium', label: 'اولوية متوسطة', color: 'bg-blue-100 text-blue-600' },
                                        { key: 'high', label: 'اولوية عالية', color: 'bg-orange-100 text-orange-600' },
                                        { key: 'emergency', label: 'طوارئ', color: 'bg-red-100 text-red-600' }
                                    ].map((level) => (
                                        <div key={level.key} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-black ${level.color}`}>{level.label}</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={(localSLA as any)[level.key]}
                                                    onChange={(e) => setLocalSLA({ ...localSLA, [level.key]: Number(e.target.value) })}
                                                    className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-black outline-none focus:border-amber-500"
                                                />
                                                <span className="text-slate-400 text-xs font-bold">ساعة</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex items-start gap-2 bg-amber-50 p-3 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700 font-bold">
                                        تغيير هذه القيم سيؤثر على حسابات التأخير لجميع البلاغات المفتوحة والجديدة.
                                    </p>
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={() => handleSaveGeneral({ geofence_config: localGeofence, sla_policies: localSLA })}
                                        disabled={saving}
                                        className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                                    >
                                        {saving ? (
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Save className="w-5 h-5" />
                                        )}
                                        حفظ التغييرات
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'workflow' && <StatusManager />}

                    {activeTab === 'forms' && <FormBuilder embedded />}

                    {activeTab === 'permissions' && <PermissionMatrix />}
                </div>
            </div>
        </div>
    );
}
