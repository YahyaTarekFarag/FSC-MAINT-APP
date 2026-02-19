import React, { useState, useEffect } from 'react';
import { useUISchema } from '../../hooks/useUISchema';
import { DynamicField } from './DynamicField';
import {
    Loader2,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { uploadTicketImage } from '../../lib/storage';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface SovereignWizardProps {
    formKey: string;
    onComplete: (data: Record<string, unknown>) => void;
    initialData?: Record<string, unknown>;
    context?: {
        branchId?: string;
    };
}

export const SovereignWizard: React.FC<SovereignWizardProps> = ({ formKey, onComplete, initialData = {}, context }) => {
    const { schema, loading, error: uiSchemaError } = useUISchema(formKey);
    console.log('[Sovereign Debug] Schema loaded:', schema);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [formData, setFormData] = useState<any>(initialData || {});
    const [error, setError] = useState<unknown>(null);
    const [dynamicOptions, setDynamicOptions] = useState<Record<string, { label: string; value: unknown }[]>>({});
    const [fetchingOptions, setFetchingOptions] = useState(false);

    const fetchRequiredData = async () => {
        if (!schema) return;
        setFetchingOptions(true);
        setError(null);
        try {
            const optionsMap: Record<string, { label: string; value: unknown }[]> = {};

            // [Sovereign Guard] Generic Lookup Data Fetching
            for (const step of (schema.steps || [])) {
                for (const field of (step.fields || [])) {
                    if ((field as any).dataSource) {
                        const table = (field as any).dataSource;
                        console.log(`[Sovereign Debug]: Fetching data for ${table}`);

                        let query = supabase.from(table).select('*');

                        // Apply context filters if applicable (e.g. branch_id for assets)
                        if (table === 'maintenance_assets' && context?.branchId) {
                            query = query.eq('branch_id', context.branchId);
                        }

                        const { data, error: fetchError } = await query;

                        if (fetchError) {
                            console.error(`[Sovereign Debug] Error fetching ${table}:`, fetchError);
                            optionsMap[field.id] = [];
                            continue; // Don't crash for one failed table
                        }

                        optionsMap[field.id] = (data as any[])?.map(item => ({
                            label: item.name_ar || item.name || item.full_name || item.title || 'بدون اسم',
                            value: item.id,
                            parentId: item.branch_id || item.area_id || item.sector_id
                        })) || [];
                    }
                }
            }
            setDynamicOptions(optionsMap as Record<string, { label: string; value: any }[]>);
        } catch (err) {
            console.error('[Sovereign Debug]: Fatal Error in dynamic fetch:', err);
            // setError(err); // Don't block whole wizard if possible, but maybe show a subtle toast
            toast.error('حدث عطل في جلب بعض القوائم المنسدلة');
        } finally {
            setFetchingOptions(false);
        }
    };

    useEffect(() => {
        if (schema) {
            fetchRequiredData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [schema, context?.branchId]);

    // [Premium Glassmorphism Loading State]
    if (loading || fetchingOptions) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-6 bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 animate-pulse">
            <div className="relative">
                <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
                <div className="absolute inset-0 blur-2xl bg-blue-500/20 rounded-full"></div>
            </div>
            <div className="text-center space-y-3">
                <p className="text-white text-2xl md:text-3xl font-black tracking-tight">جاري استدعاء هيكل النموذج...</p>
                <p className="text-white/40 text-base md:text-lg font-medium">نحن نجهز لك واجهة الاستخدام السيادية</p>
            </div>
        </div>
    );

    if (uiSchemaError || error || !schema || !schema.steps || schema.steps.length === 0) return (
        <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-4 text-white">
            <div className="bg-red-500/20 p-4 rounded-full">
                <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div>
                <h3 className="font-black text-xl mb-1">تعذر تحميل النموذج</h3>
                <p className="text-white/60">
                    {uiSchemaError ? 'خطأ في استدعاء الهيكل من الخادم' : 'هيكل البيانات غير موجود أو غير مكتمل حالياً'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-bold text-sm"
                >
                    إعادة المحاولة
                </button>
            </div>
        </div>
    );

    const currentStep = schema.steps?.[currentStepIdx];
    const isLastStep = currentStepIdx === (schema.steps?.length || 0) - 1;

    if (!currentStep) return null;

    const handleFieldChange = (fieldId: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [fieldId]: value }));
    };

    const nextStep = () => {
        const missingFields = (currentStep.fields || []).filter(f => f.required && !formData[f.id]);
        if (missingFields.length > 0) {
            toast.error(`يرجى إكمال الحقول المطلوبة: ${missingFields.map(f => f.label).join(', ')}`);
            return;
        }

        if (isLastStep) {
            onComplete(formData);
        } else {
            setCurrentStepIdx(prev => prev + 1);
        }
    };

    const prevStep = () => setCurrentStepIdx(prev => Math.max(0, prev - 1));

    return (
        <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-700 text-right" dir="rtl">
            {/* Header */}
            <div className="text-center space-y-3 mb-4">
                <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">{schema.title}</h1>
                <p className="text-white/60 text-lg md:text-xl font-medium">{schema.description}</p>
            </div>

            {/* Progress Bar */}
            <div className="flex justify-between items-center px-2">
                {(schema.steps || []).map((step, idx) => (
                    <div key={step.id} className="flex flex-col items-center gap-2">
                        <div className={`
                            w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500
                            ${idx === currentStepIdx ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-110' :
                                idx < currentStepIdx ? 'bg-emerald-500' : 'bg-white/10 backdrop-blur-md border border-white/20'}
                        `}>
                            {idx < currentStepIdx ? <CheckCircle2 className="w-6 h-6 text-white" /> : <span className="text-white text-lg font-black">{idx + 1}</span>}
                        </div>
                        <span className={`text-xs md:text-sm font-black tracking-tight ${idx === currentStepIdx ? 'text-white' : 'text-white/40'}`}>
                            {step.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Step Card */}
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[3rem] p-10 shadow-2xl space-y-8 text-right">
                <h2 className="text-2xl md:text-3xl font-black text-white border-b border-white/10 pb-6 mb-8">
                    {currentStep.label}
                </h2>

                <div className="space-y-6">
                    {(currentStep.fields || []).map((field) => (
                        <DynamicField
                            key={field.id}
                            field={{
                                ...field,
                                options: dynamicOptions[field.id] || field.options
                            }}
                            value={formData?.[field.id]}
                            formData={formData || {}}
                            onChange={(val) => handleFieldChange(field.id, val)}
                            onUpload={uploadTicketImage}
                        />
                    ))}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-4">
                {currentStepIdx > 0 && (
                    <button
                        onClick={prevStep}
                        className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 py-5 rounded-2xl text-white text-lg font-black hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                    >
                        <ArrowRight className="w-6 h-6" />
                        السابق
                    </button>
                )}
                <button
                    onClick={nextStep}
                    className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-700 py-5 rounded-2xl text-white text-xl font-black shadow-xl shadow-blue-900/40 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    {isLastStep ? 'إرسال البيانات السيادية' : 'المتابعة'}
                    {isLastStep ? <CheckCircle2 className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
                </button>
            </div>
        </div>
    );
};
