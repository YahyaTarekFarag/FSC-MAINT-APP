import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Activity, Plus, Trash2, Edit2 } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

type TicketStatus = {
    id: string;
    status_key: string;
    label_ar: string;
    color_code: string;
    sort_order: number;
    is_system_default: boolean;
};

export default function StatusManager() {
    const [loading, setLoading] = useState(true);
    const [statuses, setStatuses] = useState<TicketStatus[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        status_key: '',
        label_ar: '',
        color_code: '#808080',
        sort_order: 0
    });
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchStatuses();
    }, []);

    const fetchStatuses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ticket_statuses')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) throw error;
            setStatuses(data || []);
        } catch (error) {
            console.error('Error fetching statuses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                status_key: formData.status_key,
                label_ar: formData.label_ar,
                color_code: formData.color_code,
                sort_order: formData.sort_order
            };

            let error;
            if (editingId) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: updateError } = await (supabase.from('ticket_statuses') as any)
                    .update(payload)
                    .eq('id', editingId);
                error = updateError;
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: insertError } = await (supabase.from('ticket_statuses') as any)
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            toast.success(editingId ? 'تم تحديث الحالة' : 'تم إضافة الحالة');
            fetchStatuses();
            resetForm();
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = error as any;
            toast.error(err.message || 'فشل الحفظ');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const { error } = await supabase
                .from('ticket_statuses')
                .delete()
                .eq('id', deleteId);

            if (error) throw error;
            toast.success('تم حذف الحالة');
            fetchStatuses();
        } catch (error) {
            toast.error('لا يمكن حذف هذه الحالة (قد تكون مرتبطة بتذاكر موجودة)');
        } finally {
            setDeleteId(null);
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setEditingId(null);
        setFormData({ status_key: '', label_ar: '', color_code: '#808080', sort_order: 0 });
    };

    const startEdit = (status: TicketStatus) => {
        setFormData({
            status_key: status.status_key,
            label_ar: status.label_ar,
            color_code: status.color_code,
            sort_order: status.sort_order
        });
        setEditingId(status.id);
        setIsEditing(true);
    };

    if (loading && statuses.length === 0) return <div>جاري التحميل...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-orange-600" />
                        محرك سير العمل (Workflow Engine)
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">إدارة حالات التذاكر وألوانها</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        حالة جديدة
                    </button>
                )}
            </div>

            {isEditing && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in slide-in-from-top-4">
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">رمز الحالة (System Key)</label>
                            <input
                                required
                                type="text"
                                disabled={!!editingId} // Key immutable on edit
                                value={formData.status_key}
                                onChange={e => setFormData({ ...formData, status_key: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 disabled:bg-slate-200"
                                placeholder="e.g. pending_approval"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الاسم بالعربي</label>
                            <input
                                required
                                type="text"
                                value={formData.label_ar}
                                onChange={e => setFormData({ ...formData, label_ar: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2"
                                placeholder="مثال: بانتظار الموافقة"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">اللون</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={formData.color_code}
                                    onChange={e => setFormData({ ...formData, color_code: e.target.value })}
                                    className="h-10 w-20 rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={formData.color_code}
                                    onChange={e => setFormData({ ...formData, color_code: e.target.value })}
                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono uppercase"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">الترتيب</label>
                            <input
                                type="number"
                                value={formData.sort_order}
                                onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-4 py-2 rounded-lg text-slate-500 hover:bg-slate-200"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700"
                            >
                                حفظ
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600">الترتيب</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600">الحالة</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600">الرمز (Key)</th>
                            <th className="px-6 py-4 text-sm font-bold text-slate-600 text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {statuses.map((status) => (
                            <tr key={status.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-slate-500 font-mono">{status.sort_order}</td>
                                <td className="px-6 py-4">
                                    <span
                                        className="px-3 py-1 rounded-full text-sm font-bold text-white shadow-sm"
                                        style={{ backgroundColor: status.color_code }}
                                    >
                                        {status.label_ar}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm font-mono text-slate-400">{status.status_key}</td>
                                <td className="px-6 py-4 flex justify-center gap-2">
                                    <button
                                        onClick={() => startEdit(status)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    {!status.is_system_default && (
                                        <button
                                            onClick={() => setDeleteId(status.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {statuses.length === 0 && (
                    <EmptyState
                        icon={Activity}
                        title="لا توجد حالات معرفة"
                        description="قم بإضافة حالات جديدة أو تشغيل الـ SQL لإضافة الحالات الافتراضية."
                    />
                )}
            </div>

            <ConfirmDialog
                isOpen={!!deleteId}
                title="حذف الحالة"
                message="هل أنت متأكد من حذف هذه الحالة؟ لا يمكن التراجع عن هذا الإجراء."
                confirmLabel="حذف"
                cancelLabel="إلغاء"
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
                variant="danger"
            />
        </div>
    );
}
