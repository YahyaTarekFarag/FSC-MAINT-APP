import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Plus,
    Trash2,
    Type,
    Hash,
    Camera,
    List,
    ToggleLeft,
    CheckCircle2,
    Loader2,
    X,
    AlignLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types matching the new schema
type FormDefinition = {
    id: string;
    form_key: string;
    field_key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'yes_no' | 'photo' | 'date' | 'textarea' | 'checkbox';
    is_required: boolean;
    order_index: number;
    options: string[] | null;
    is_active: boolean;
};

const FORM_KEYS = [
    { key: 'new_ticket', label: 'تذكرة جديدة (عميل)' },
    { key: 'job_report', label: 'تقرير إنجاز (فني)' },
    { key: 'site_survey', label: 'مسح ميداني' }
];

const FIELD_TYPES = [
    { value: 'text', label: 'نص قصير', icon: Type },
    { value: 'textarea', label: 'نص طويل', icon: AlignLeft },
    { value: 'number', label: 'رقم', icon: Hash },
    { value: 'select', label: 'قائمة اختيار', icon: List },
    { value: 'yes_no', label: 'نعم/لا', icon: ToggleLeft },
    { value: 'photo', label: 'صورة', icon: Camera },
    { value: 'date', label: 'تاريخ', icon: List }, // Recycle List icon or Calendar if available
    { value: 'checkbox', label: 'صندوق اختيار', icon: CheckCircle2 },
];

export default function FormManager() {
    const [selectedFormKey, setSelectedFormKey] = useState('new_ticket');
    const [fields, setFields] = useState<FormDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // New Field State
    const [newField, setNewField] = useState<Partial<FormDefinition>>({
        type: 'text',
        is_required: false,
        is_active: true,
        options: []
    });
    const [newOption, setNewOption] = useState('');

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        fetchFields();
    }, [selectedFormKey]);

    const fetchFields = async () => {
        setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from('form_definitions') as any)
                .select('*')
                .eq('form_key', selectedFormKey)
                .order('order_index', { ascending: true });

            if (error) throw error;
            setFields(data || []);
        } catch (error) {
            console.error('Error fetching fields:', error);
            toast.error('فشل تحميل الحقول');
        } finally {
            setLoading(false);
        }
    };

    const handleAddField = async () => {
        if (!newField.label || !newField.field_key) {
            toast.error('يرجى ملء البيانات الأساسية');
            return;
        }

        setSaving(true);
        try {
            const maxOrder = Math.max(...fields.map(f => f.order_index), 0);

            const payload = {
                form_key: selectedFormKey,
                field_key: newField.field_key,
                label: newField.label,
                type: newField.type,
                is_required: newField.is_required,
                is_active: newField.is_active,
                order_index: maxOrder + 1,
                options: newField.options?.length ? newField.options : null
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('form_definitions') as any)
                .insert(payload);

            if (error) throw error;

            toast.success('تم إضافة الحقل بنجاح');
            setShowAddModal(false);
            setNewField({ type: 'text', is_required: false, is_active: true, options: [] });
            fetchFields();
        } catch (error: any) {
            toast.error(error.message || 'فشل إضافة الحقل');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteField = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا الحقل؟')) return;

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('form_definitions') as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('تم حذف الحقل');
            setFields(fields.filter(f => f.id !== id));
        } catch (error) {
            toast.error('فشل الحذف');
        }
    };

    const handleToggleRequired = async (field: FormDefinition) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('form_definitions') as any)
                .update({ is_required: !field.is_required })
                .eq('id', field.id);

            if (error) throw error;
            setFields(fields.map(f => f.id === field.id ? { ...f, is_required: !f.is_required } : f));
        } catch (error) {
            toast.error('حدث خطأ');
        }
    };

    const handleAddOption = () => {
        if (!newOption.trim()) return;
        setNewField(prev => ({
            ...prev,
            options: [...(prev.options || []), newOption.trim()]
        }));
        setNewOption('');
    };

    const removeOption = (idx: number) => {
        setNewField(prev => ({
            ...prev,
            options: prev.options?.filter((_, i) => i !== idx)
        }));
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen font-sans" dir="rtl">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">مصمم النماذج الذكي</h1>
                        <p className="text-slate-500">إدارة الحقول الديناميكية للنماذج المختلفة</p>
                    </div>

                    <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                        {FORM_KEYS.map(form => (
                            <button
                                key={form.key}
                                onClick={() => setSelectedFormKey(form.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedFormKey === form.key
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                {form.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="text-sm font-bold text-slate-500">
                            {fields.length} حقول مخصصة
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                        >
                            <Plus className="w-5 h-5" />
                            إضافة حقل جديد
                        </button>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="w-10 h-10 animate-spin mb-4" />
                            <p>جاري تحميل الحقول...</p>
                        </div>
                    ) : fields.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <List className="w-16 h-16 mb-4 opacity-20" />
                            <p className="font-bold text-lg text-slate-600">القائمة فارغة</p>
                            <p className="text-sm">لم يتم تعريف أي حقول لهذا النموذج بعد</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {fields.map((field) => (
                                <div key={field.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors group">
                                    <div className="p-3 bg-slate-100 rounded-lg text-slate-500">
                                        {(() => {
                                            const iconType = FIELD_TYPES.find(t => t.value === field.type);
                                            const IconComponent = iconType ? iconType.icon : Type;
                                            return <IconComponent className="w-5 h-5" />;
                                        })()}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-800">{field.label}</h3>
                                            {field.is_required && (
                                                <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] rounded-full font-bold">مطلوب</span>
                                            )}
                                        </div>
                                        <code className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                                            {field.field_key}
                                        </code>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleToggleRequired(field)}
                                            className={`p-2 rounded-lg transition-colors ${field.is_required ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                            title="تبديل خيار (مطلوب)"
                                        >
                                            <AlertCircleIcon isRequired={field.is_required} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteField(field.id)}
                                            className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                                            title="حذف"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Field Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">إضافة حقل جديد</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1 rounded-full hover:bg-slate-200 transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">اسم الحقل (Label)</label>
                                    <input
                                        type="text"
                                        value={newField.label || ''}
                                        onChange={e => setNewField({ ...newField, label: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                                        placeholder="مثال: قراءة العداد"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">المعرف البرمجي (Key)</label>
                                    <input
                                        type="text"
                                        value={newField.field_key || ''}
                                        onChange={e => setNewField({ ...newField, field_key: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 font-mono text-sm"
                                        placeholder="meter_reading"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">نوع الحقل</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {FIELD_TYPES.map(type => (
                                        <button
                                            key={type.value}
                                            onClick={() => setNewField({ ...newField, type: type.value as any })}
                                            className={`flex items-center gap-2 p-2 rounded-lg border text-sm font-bold transition-all ${newField.type === type.value
                                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                }`}
                                        >
                                            <type.icon className="w-4 h-4" />
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <input
                                    type="checkbox"
                                    checked={newField.is_required}
                                    onChange={e => setNewField({ ...newField, is_required: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-bold text-slate-700">هذا الحقل مطلوب (Required)</span>
                            </div>

                            {newField.type === 'select' && (
                                <div className="p-3 bg-slate-50 rounded-xl space-y-3">
                                    <label className="block text-sm font-bold text-slate-700">الخيارات المتاحة</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newOption}
                                            onChange={e => setNewOption(e.target.value)}
                                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500 text-sm"
                                            placeholder="أضف خياراً..."
                                        />
                                        <button
                                            onClick={handleAddOption}
                                            className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
                                        >
                                            إضافة
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {newField.options?.map((opt, idx) => (
                                            <span key={idx} className="bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-lg text-sm flex items-center gap-1">
                                                {opt}
                                                <button onClick={() => removeOption(idx)} className="hover:text-red-500">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleAddField}
                                disabled={saving}
                                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                                حفظ الحقل
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const AlertCircleIcon = ({ isRequired }: { isRequired: boolean }) => (
    <div className="relative">
        <CheckCircle2 className={`w-4 h-4 ${isRequired ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute inset-0 border-2 border-slate-300 rounded-full ${isRequired ? 'opacity-0' : 'opacity-100'}`} />
    </div>
);
