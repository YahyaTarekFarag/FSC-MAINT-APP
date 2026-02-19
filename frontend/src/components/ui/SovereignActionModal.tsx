import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { UISchema } from '../../hooks/useSovereignSchema';
import toast from 'react-hot-toast';

interface SovereignActionModalProps {
    schema: UISchema;
    tableName: string;
    mode: 'add' | 'edit';
    item?: any;
    onClose: () => void;
    onSuccess: () => void;
}

export const SovereignActionModal: React.FC<SovereignActionModalProps> = ({
    schema,
    tableName,
    mode,
    item,
    onClose,
    onSuccess
}) => {
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [optionsData, setOptionsData] = useState<Record<string, any[]>>({});

    useEffect(() => {
        if (mode === 'edit' && item) {
            setFormData(item);
        } else {
            // Initialize with default values if any
            const defaults: any = { is_active: true };
            schema.form_config.fields.forEach(f => {
                if (f.type === 'checkbox') defaults[f.id] = true;
            });
            setFormData(defaults);
        }

        // Fetch dynamic options (dataSources)
        schema.form_config.fields.forEach(async (field) => {
            if (field.dataSource) {
                const { data } = await supabase.from(field.dataSource).select('id, name_ar').eq('is_active', true);
                setOptionsData(prev => ({ ...prev, [field.dataSource!]: data || [] }));
            }
        });
    }, [mode, item, schema.form_config.fields]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === 'add') {
                const { error } = await supabase.from(tableName).insert([formData]);
                if (error) throw error;
                toast.success('تمت الإضافة بنجاح للسجل السيادي');
            } else {
                const { id, created_at, updated_at, ...updates } = formData;
                const { error } = await supabase.from(tableName).update(updates).eq('id', item.id);
                if (error) throw error;
                toast.success('تم تحديث البيانات بنجاح');
            }
            onSuccess();
        } catch (err: any) {
            console.error('[Sovereign Action Error]:', err);
            toast.error(err.message || 'فشل في تنفيذ العملية');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            {mode === 'add' ? `إضافة ${schema.title} جديد` : `تعديل ${schema.title}`}
                        </h2>
                        <p className="text-white/40 text-xs font-bold mt-1 uppercase tracking-widest">Sovereign Data Entry Protocol</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {schema.form_config.fields.map(field => (
                            <div key={field.id} className={`${field.type === 'textarea' ? 'md:col-span-2' : ''} space-y-2`}>
                                <label className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] px-2">
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>

                                {field.type === 'textarea' ? (
                                    <textarea
                                        required={field.required}
                                        value={formData[field.id] || ''}
                                        onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                                        placeholder={field.placeholder}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all min-h-[120px]"
                                    />
                                ) : field.type === 'select' ? (
                                    <select
                                        required={field.required}
                                        value={formData[field.id] || ''}
                                        onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-blue-500 transition-all appearance-none"
                                    >
                                        <option value="" className="bg-slate-900">اختر {field.label}...</option>
                                        {field.dataSource ? (
                                            optionsData[field.dataSource]?.map(opt => (
                                                <option key={opt.id} value={opt.id} className="bg-slate-900">{opt.name_ar}</option>
                                            ))
                                        ) : (
                                            Array.isArray(field.options) && field.options.map((opt: any) => {
                                                const label = typeof opt === 'string' ? opt : opt.label;
                                                const value = typeof opt === 'string' ? opt : opt.value;
                                                return <option key={value} value={value} className="bg-slate-900">{label}</option>;
                                            })
                                        )}
                                    </select>
                                ) : field.type === 'checkbox' ? (
                                    <div
                                        onClick={() => setFormData({ ...formData, [field.id]: !formData[field.id] })}
                                        className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 cursor-pointer hover:bg-white/10 transition-all"
                                    >
                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData[field.id] ? 'bg-blue-600 border-blue-400' : 'border-white/20'}`}>
                                            {formData[field.id] && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                                        </div>
                                        <span className="font-bold text-white/80">{field.label}</span>
                                    </div>
                                ) : (
                                    <input
                                        type={field.type === 'number' ? 'number' : 'text'}
                                        required={field.required}
                                        value={formData[field.id] || ''}
                                        onChange={e => setFormData({ ...formData, [field.id]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                                        placeholder={field.placeholder}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {loading && (
                        <div className="flex items-center gap-3 text-blue-400 mt-4 animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs font-black uppercase tracking-widest">جاري معالجة البيانات...</span>
                        </div>
                    )}
                </form>

                <div className="p-8 bg-white/5 border-t border-white/5 flex gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 px-6 rounded-2xl border border-white/10 text-white/60 font-black hover:bg-white/5 transition-all"
                    >
                        إلغاء العملية
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-4 px-6 rounded-2xl bg-blue-600 text-white font-black shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {mode === 'add' ? 'تأكيد الحفظ' : 'حفظ التعديلات'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Check = ({ className, strokeWidth }: { className?: string, strokeWidth?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
