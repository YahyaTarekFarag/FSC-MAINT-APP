import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'تأكيد',
    cancelLabel = 'إلغاء',
    variant = 'danger',
    isLoading = false,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'bg-red-50',
            icon: 'text-red-600',
            button: 'bg-red-600 hover:bg-red-700 shadow-red-100',
            iconComponent: AlertTriangle
        },
        warning: {
            bg: 'bg-amber-50',
            icon: 'text-amber-600',
            button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-100',
            iconComponent: AlertTriangle
        },
        info: {
            bg: 'bg-blue-50',
            icon: 'text-blue-600',
            button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-100',
            iconComponent: AlertTriangle // Could change if needed
        }
    };

    const style = colors[variant];
    const Icon = style.iconComponent;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onCancel}
                    className="absolute left-4 top-4 p-2 hover:bg-slate-50 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-slate-400" />
                </button>

                <div className="text-center">
                    <div className={`w-16 h-16 ${style.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                        <Icon className={`w-8 h-8 ${style.icon}`} />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 font-medium leading-relaxed mb-8">
                        {message}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 ${style.button} text-white py-3 rounded-xl font-bold transition-all shadow-lg flex justify-center items-center gap-2`}
                        >
                            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                            {confirmLabel}
                        </button>
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                        >
                            {cancelLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
