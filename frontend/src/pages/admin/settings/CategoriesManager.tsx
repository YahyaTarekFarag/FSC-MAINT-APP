import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Plus, Trash2, Edit2, Check, X
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// Icon Picker List (Subset of Lucide)
const AVAILABLE_ICONS = [
    'Zap', 'Home', 'PenTool', 'Layout', 'Box', 'Activity', 'AlertTriangle', 'Info',
    'Cpu', 'Database', 'Server', 'Settings', 'Tool', 'Truck', 'Wifi', 'Wrench'
];

interface Category {
    id: string;
    name_ar: string;
    icon: string;
    is_active: boolean;
    created_at?: string;
}

const CategoriesManager = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Category>>({});
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('fault_categories')
            .select('*')
            .order('created_at', { ascending: true });

        if (!error && data) setCategories(data);
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            if (isCreating) {
                const { error } = await supabase.from('fault_categories').insert([formData]);
                if (error) throw error;
            } else if (editingId) {
                const { error } = await supabase
                    .from('fault_categories')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
            }
            fetchCategories();
            setEditingId(null);
            setIsCreating(false);
            setFormData({});
        } catch (error) {
            console.error('Error saving category:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;
        const { error } = await supabase.from('fault_categories').delete().eq('id', id);
        if (!error) fetchCategories();
    };

    const startEdit = (cat: Category) => {
        setEditingId(cat.id);
        setFormData(cat);
        setIsCreating(false);
    };

    const startCreate = () => {
        setIsCreating(true);
        setEditingId(null);
        setFormData({ is_active: true, icon: 'Activity' });
    };

    const renderIcon = (iconName: string) => {
        // @ts-expect-error - Dynamic icon access from Lucide icons
        const Icon = LucideIcons[iconName] || LucideIcons.HelpCircle;
        return <Icon className="w-5 h-5" />;
    };

    if (loading) return <div className="p-8 text-center text-slate-500">جاري التحميل...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">تصنيفات الأعطال</h3>
                <button
                    onClick={startCreate}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    إضافة تصنيف
                </button>
            </div>

            {isCreating && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4">
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-xs font-bold text-blue-800">الاسم بالعربية</label>
                        <input
                            value={formData.name_ar || ''}
                            onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                            className="w-full p-2 rounded-lg border border-blue-200 outline-none focus:border-blue-500"
                            placeholder="مثال: كهرباء"
                        />
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                        <label className="text-xs font-bold text-blue-800">الأيقونة</label>
                        <select
                            value={formData.icon || ''}
                            onChange={e => setFormData({ ...formData, icon: e.target.value })}
                            className="w-full p-2 rounded-lg border border-blue-200 outline-none focus:border-blue-500 bg-white"
                        >
                            {AVAILABLE_ICONS.map(icon => (
                                <option key={icon} value={icon}>{icon}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSave} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Check className="w-5 h-5" /></button>
                        <button onClick={() => setIsCreating(false)} className="p-2 bg-white text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"><X className="w-5 h-5" /></button>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm group">
                        {editingId === cat.id ? (
                            <div className="flex flex-1 gap-4 items-center">
                                <input
                                    value={formData.name_ar || ''}
                                    onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                    className="flex-1 p-2 rounded-lg border border-slate-200"
                                />
                                <select
                                    value={formData.icon || ''}
                                    onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                    className="p-2 rounded-lg border border-slate-200 bg-white"
                                >
                                    {AVAILABLE_ICONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <button onClick={handleSave} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"><Check className="w-4 h-4" /></button>
                                    <button onClick={() => setEditingId(null)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><X className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-slate-50 rounded-lg text-slate-600">
                                        {renderIcon(cat.icon)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{cat.name_ar}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-2 h-2 rounded-full ${cat.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <span className="text-xs text-slate-500">{cat.is_active ? 'نشط' : 'معطل'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEdit(cat)} className="p-2 hover:bg-slate-100 rounded-lg text-blue-600"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(cat.id)} className="p-2 hover:bg-slate-100 rounded-lg text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoriesManager;
