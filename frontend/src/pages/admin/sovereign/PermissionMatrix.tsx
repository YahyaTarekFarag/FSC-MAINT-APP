import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Shield, Lock, Unlock, RefreshCw, AlertCircle } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';

type Permission = {
    id: string;
    role: string;
    feature_key: string;
    is_enabled: boolean;
};

const ROLES = ['admin', 'manager', 'technician'];
const FEATURES = [
    { key: 'view_cost', label: 'مراقة التكاليف (View Costs)' },
    { key: 'delete_ticket', label: 'حذف التذاكر (Delete Tickets)' },
    { key: 'view_map', label: 'الوصول للخريطة (View Map)' },
    { key: 'edit_asset', label: 'تعديل الأصول (Edit Assets)' },
    { key: 'approve_purchase', label: 'اعتماد المشتريات (Approve PO)' }
];

export default function PermissionMatrix() {
    const [loading, setLoading] = useState(true);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPermissions();
    }, []);

    const fetchPermissions = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('role_permissions')
                .select('*');

            if (error) throw error;
            setPermissions(data || []);
        } catch (error) {
            console.error('Error fetching permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const isEnabled = (role: string, feature: string) => {
        return permissions.find(p => p.role === role && p.feature_key === feature)?.is_enabled || false;
    };

    const togglePermission = async (role: string, feature: string) => {
        // Optimistic update
        const existing = permissions.find(p => p.role === role && p.feature_key === feature);
        const newValue = !existing?.is_enabled;

        // Update local state
        if (existing) {
            setPermissions(permissions.map(p =>
                p.id === existing.id ? { ...p, is_enabled: newValue } : p
            ));
        } else {
            // Placeholder for new perms not yet in DB
            const tempId = Math.random().toString();
            setPermissions([...permissions, { id: tempId, role, feature_key: feature, is_enabled: newValue }]);
        }

        // Persist
        try {
            const { error } = await supabase
                .from('role_permissions')
                .upsert({
                    role,
                    feature_key: feature,
                    is_enabled: newValue
                }, { onConflict: 'role, feature_key' });

            if (error) throw error;
            toast.success('تم تحديث الصلاحية');
        } catch (error) {
            console.error('Error saving permission:', error);
            toast.error('فشل حفظ الصلاحية');
            fetchPermissions(); // Revert
        }
    };

    if (loading && permissions.length === 0) {
        return <div className="p-8 text-center text-slate-500">جاري تحميل مصفوفة الصلاحيات...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-purple-600" />
                        مصفوفة الصلاحيات (Permission Matrix)
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">التحكم في وصول الرتب المختلفة للميزات</p>
                </div>
                <button onClick={fetchPermissions} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 w-1/3">الميزة / الخاصية</th>
                            {ROLES.map(role => (
                                <th key={role} className="px-6 py-4 text-sm font-bold text-slate-600 text-center uppercase tracking-wider">
                                    {role}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {FEATURES.map((feature) => (
                            <tr key={feature.key} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800">{feature.label}</div>
                                    <div className="text-xs font-mono text-slate-400 mt-1">{feature.key}</div>
                                </td>
                                {ROLES.map(role => {
                                    const active = isEnabled(role, feature.key);
                                    return (
                                        <td key={`${role}-${feature.key}`} className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => togglePermission(role, feature.key)}
                                                className={`p-3 rounded-xl transition-all duration-200 group ${active
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                                    }`}
                                            >
                                                {active ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <strong>تنبيه:</strong> التغييرات هنا تطبق فورياً على المستخدمين، لكن قد يضطر المفوضون لتحديث الصفحة لرؤية التأثير.
                </div>
            </div>
        </div>
    );
}
