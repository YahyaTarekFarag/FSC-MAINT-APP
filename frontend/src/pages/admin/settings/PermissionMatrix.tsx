import { useState, useEffect } from 'react';
import { Shield, Save, RefreshCw, CheckCircle2, XCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSystemSettings } from '../../../contexts/SystemSettingsContext';

interface PermissionNode {
    id: string;
    label: string;
    description: string;
}

const NODES: PermissionNode[] = [
    { id: 'dashboard.view', label: 'لوحة التحكم', description: 'عرض الإحصائيات العامة' },
    { id: 'tickets.create', label: 'إنشاء بلاغ', description: 'إمكانية رفع بلاغ جديد' },
    { id: 'tickets.view_all', label: 'عرض كل البلاغات', description: 'مشاهدة بلاغات كل الفروع' },
    { id: 'tickets.view_assigned', label: 'عرض البلاغات المسندة', description: 'مشاهدة البلاغات الخاصة فقط' },
    { id: 'tickets.manage', label: 'إدارة البلاغات', description: 'تغيير الحالة، إسناد الفنيين' },
    { id: 'assets.view', label: 'عرض الأصول', description: 'تصفح قائمة الأصول' },
    { id: 'assets.manage', label: 'إدارة الأصول', description: 'إضافة وتعديل وحذف الأصول' },
    { id: 'users.manage', label: 'إدارة المستخدمين', description: 'إضافة وتعديل حسابات الموظفين' },
    { id: 'settings.manage', label: 'إعدادات النظام', description: 'التحكم في المتغيرات العامة' },
    { id: 'reports.view', label: 'التقارير', description: 'توليد وتصدير التقارير' },
];

const ROLES = [
    { id: 'admin', label: 'مدير النظام (Admin)', color: 'bg-purple-100 text-purple-700' },
    { id: 'manager', label: 'مدير فرع (Manager)', color: 'bg-blue-100 text-blue-700' },
    { id: 'technician', label: 'فني صيانة (Technician)', color: 'bg-green-100 text-green-700' },
];

export default function PermissionMatrix() {
    const { settings, updateSetting, loading: contextLoading } = useSystemSettings();
    const [permissions, setPermissions] = useState<Record<string, string[]>>({
        admin: NODES.map(n => n.id),
        manager: [],
        technician: []
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!contextLoading) {
            const matrix = settings['permissions_matrix'];
            if (matrix) {
                setPermissions(matrix);
            }
        }
    }, [settings, contextLoading]);

    const togglePermission = (role: string, nodeId: string) => {
        setPermissions(prev => {
            const rolePerms = prev[role] || [];
            const hasPerm = rolePerms.includes(nodeId);

            let newRolePerms;
            if (hasPerm) {
                newRolePerms = rolePerms.filter(id => id !== nodeId);
            } else {
                newRolePerms = [...rolePerms, nodeId];
            }

            return {
                ...prev,
                [role]: newRolePerms
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateSetting('permissions_matrix', permissions);
            toast.success('تم تحديث الصلاحيات بنجاح');
        } catch (error) {
            console.error('Error saving permissions:', error);
            toast.error('فشل الحفظ');
        } finally {
            setSaving(false);
        }
    };

    if (contextLoading) return <div className="p-12 text-center text-slate-500">جاري تحميل مصفوفة الصلاحيات...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Shield className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">مصفوفة الصلاحيات (Permission Matrix)</h2>
                        <p className="text-slate-500 mt-1">التحكم الدقيق في صلاحيات كل رتبة وظيفية</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                    {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    حفظ التغييرات
                </button>
            </div>

            {/* Matrix Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-right p-4 min-w-[300px] font-black text-slate-700">الخاصية / الصلاحية</th>
                                {ROLES.map(role => (
                                    <th key={role.id} className="p-4 min-w-[150px]">
                                        <span className={`px-3 py-1 rounded-lg text-sm font-bold ${role.color}`}>
                                            {role.label}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {NODES.map(node => (
                                <tr key={node.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{node.label}</div>
                                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            {node.description}
                                        </div>
                                    </td>
                                    {ROLES.map(role => {
                                        const rolePerms = permissions[role.id] || [];
                                        const hasPerm = rolePerms.includes(node.id);
                                        return (
                                            <td key={`${role.id}-${node.id}`} className="p-4 text-center">
                                                <button
                                                    onClick={() => togglePermission(role.id, node.id)}
                                                    className={`p-2 rounded-full transition-all ${hasPerm
                                                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200 hover:text-slate-400'
                                                        }`}
                                                >
                                                    {hasPerm ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800 text-sm flex items-start gap-3">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                    ملاحظة: التغييرات على الصلاحيات قد تتطلب تسجيل خروج وشمول المستخدمين بالتحديث لتفعليها بشكل كامل.
                    في الإصدارات القادمة، سيتم تحديث الصلاحيات لحظياً (Real-time).
                </p>
            </div>
        </div>
    );
}
