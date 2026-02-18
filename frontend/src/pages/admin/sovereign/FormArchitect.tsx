import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Save, RefreshCw, Eye, EyeOff, CheckSquare, Square, Type, List, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';

type FormFieldConfig = {
    id: string;
    form_id: string;
    field_key: string;
    label_ar: string;
    label_en: string | null;
    is_visible: boolean;
    is_required: boolean;
    field_type: string;
    sort_order: number;
    options: any;
};

export default function FormArchitect() {
    const [loading, setLoading] = useState(true);
    const [fields, setFields] = useState<FormFieldConfig[]>([]);
    const [selectedForm, setSelectedForm] = useState('new_ticket');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchFields();
    }, [selectedForm]);

    const fetchFields = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('form_field_configs')
                .select('*')
                .eq('form_id', selectedForm)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            setFields(data || []);
        } catch (error) {
            console.error('Error fetching form fields:', error);
            // Don't show error toast on 404/empty if table doesn't exist yet
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateField = (id: string, updates: Partial<FormFieldConfig>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const saveChanges = async () => {
        setSaving(true);
        try {
            const updates = fields.map(f => ({
                id: f.id,
                label_ar: f.label_ar,
                is_visible: f.is_visible,
                is_required: f.is_required,
                sort_order: f.sort_order
            }));

            const { error } = await supabase
                .from('form_field_configs')
                .upsert(updates);

            if (error) throw error;
            toast.success('تم حفظ إعدادات النموذج بنجاح');
        } catch (error: any) {
            console.error('Error saving fields:', error);
            toast.error(error.message || 'فشل الحفظ');
        } finally {
            setSaving(false);
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'text': return <Type className="w-4 h-4" />;
            case 'textarea': return <List className="w-4 h-4" />;
            case 'select': return <CheckSquare className="w-4 h-4" />;
            case 'file': return <ImageIcon className="w-4 h-4" />;
            default: return <Type className="w-4 h-4" />;
        }
    };

    if (loading && fields.length === 0) {
        return <div className="p-8 text-center">جاري تحميل مهندس النماذج...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Type className="w-6 h-6 text-blue-600" />
                        مهندس النماذج (Form Architect)
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">تخصيص الحقول والنماذج ديناميكياً</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedForm}
                        onChange={(e) => setSelectedForm(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="new_ticket">نموذج تذكرة جديدة</option>
                        <option value="close_ticket">نموذج إغلاق تذكرة</option>
                    </select>
                    <button
                        onClick={saveChanges}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        حفظ التغييرات
                    </button>
                </div>
            </div>

            {fields.length === 0 ? (
                <EmptyState
                    icon={AlertCircle}
                    title="لا توجد حقول معرفة"
                    description="لم يتم العثور على إعدادات الحقول لهذا النموذج. تأكد من تشغيل ملفات SQL الخاصة بالمرحلة 60."
                    actionLabel="تحديث البيانات"
                    onAction={fetchFields}
                />
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold text-slate-600">الحقل (System Key)</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-600">النوع</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-600">تسمية الحقل (عربي)</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-600 text-center">إظهار</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-600 text-center">إلزامي</th>
                                <th className="px-6 py-4 text-sm font-bold text-slate-600 text-center">الترتيب</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {fields.map((field) => (
                                <tr key={field.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">
                                            {field.field_key}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                                            {getIconForType(field.field_type)}
                                            <span className="capitalize">{field.field_type}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            value={field.label_ar}
                                            onChange={(e) => handleUpdateField(field.id, { label_ar: e.target.value })}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleUpdateField(field.id, { is_visible: !field.is_visible })}
                                            className={`p-2 rounded-lg transition-colors ${field.is_visible ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}
                                        >
                                            {field.is_visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handleUpdateField(field.id, { is_required: !field.is_required })}
                                            className={`p-2 rounded-lg transition-colors ${field.is_required ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}
                                        >
                                            {field.is_required ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <input
                                            type="number"
                                            value={field.sort_order}
                                            onChange={(e) => handleUpdateField(field.id, { sort_order: parseInt(e.target.value) || 0 })}
                                            className="w-16 text-center bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
