import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { SovereignWizard } from '../tickets/SovereignWizard';

interface SovereignActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    schemaKey: string;
    initialData?: any;
    title: string;
    onComplete: (data: any) => void;
    loading?: boolean;
}

export const SovereignActionModal: React.FC<SovereignActionModalProps> = ({
    isOpen,
    onClose,
    schemaKey,
    initialData,
    title,
    onComplete,
    loading
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-10 border-b border-white/10 bg-white/[0.02]">
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-4 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white hover:rotate-90"
                    >
                        <X className="w-8 h-8" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-10 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-6">
                            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                            <p className="text-white/60 text-xl font-black">جاري الاستدعاء السيادي...</p>
                        </div>
                    ) : schemaKey ? (
                        <SovereignWizard
                            formKey={schemaKey}
                            initialData={initialData || {}}
                            onComplete={onComplete}
                        />
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-red-400 font-bold">خطأ: لم يتم تحديد مفتاح النموذج السيادي</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
