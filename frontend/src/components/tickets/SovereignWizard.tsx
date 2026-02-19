import React, { useState } from 'react';
import { useUISchema } from '../../hooks/useUISchema';
import { DynamicField } from './DynamicField';
import {
    Loader2,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { uploadTicketImage } from '../../lib/storage';
import toast from 'react-hot-toast';

interface SovereignWizardProps {
    formKey: string;
    onComplete: (data: any) => void;
    initialData?: any;
}

export const SovereignWizard: React.FC<SovereignWizardProps> = ({ formKey, onComplete, initialData = {} }) => {
    const { schema, loading, error } = useUISchema(formKey);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);
    const [formData, setFormData] = useState(initialData);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-white/60 font-bold">جاري تحميل الهيكلية السيادية...</p>
        </div>
    );

    if (error || !schema) return (
        <div className="bg-red-500/20 backdrop-blur-md border border-red-500/40 p-6 rounded-3xl flex items-center gap-4 text-white">
            <AlertCircle className="w-8 h-8" />
            <div>
                <h3 className="font-bold">خطأ في تحميل النموذج</h3>
                <p className="text-sm opacity-80">تعذر الوصول إلى تعريف الواجهة المطلوبة</p>
            </div>
        </div>
    );

    const currentStep = schema.steps[currentStepIdx];
    const isLastStep = currentStepIdx === schema.steps.length - 1;

    const handleFieldChange = (fieldId: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [fieldId]: value }));
    };

    const nextStep = () => {
        // Validation check
        const missingFields = currentStep.fields.filter(f => f.required && !formData[f.id]);
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
        <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-white">{schema.title}</h1>
                <p className="text-white/60 font-medium">{schema.description}</p>
            </div>

            {/* Progress Bar */}
            <div className="flex justify-between items-center px-2">
                {schema.steps.map((step, idx) => (
                    <div key={step.id} className="flex flex-col items-center gap-2">
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                            ${idx === currentStepIdx ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-110' :
                                idx < currentStepIdx ? 'bg-emerald-500' : 'bg-white/10 backdrop-blur-md border border-white/20'}
                        `}>
                            {idx < currentStepIdx ? <CheckCircle2 className="w-5 h-5 text-white" /> : <span className="text-white font-bold">{idx + 1}</span>}
                        </div>
                        <span className={`text-[10px] font-bold ${idx === currentStepIdx ? 'text-white' : 'text-white/40'}`}>
                            {step.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* Step Card */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                <h2 className="text-xl font-bold text-white border-b border-white/10 pb-4 mb-6">
                    {currentStep.label}
                </h2>

                <div className="space-y-6">
                    {currentStep.fields.map((field) => (
                        <DynamicField
                            key={field.id}
                            field={field}
                            value={formData[field.id]}
                            formData={formData}
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
                        className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 py-4 rounded-2xl text-white font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowRight className="w-5 h-5" />
                        السابق
                    </button>
                )}
                <button
                    onClick={nextStep}
                    className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-700 py-4 rounded-2xl text-white font-black shadow-xl shadow-blue-900/40 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    {isLastStep ? 'إرسال المهمة السيادية' : 'المتابعة'}
                    {isLastStep ? <CheckCircle2 className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                </button>
            </div>
        </div>
    );
};
