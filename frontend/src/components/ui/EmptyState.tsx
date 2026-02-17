import React from 'react';


interface EmptyStateProps {
    icon: React.ComponentType<any>;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className = ''
}) => {
    return (
        <div className={`flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500 ${className}`}>
            <div className="bg-slate-50 p-6 rounded-full mb-6">
                <Icon className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
                {description}
            </p>
            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
