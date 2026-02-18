
import React from 'react';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'outline';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    className?: string;
    icon?: React.ElementType;
}

const variants: Record<BadgeVariant, string> = {
    primary: 'bg-blue-50 text-blue-700 border-blue-100',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
    danger: 'bg-red-50 text-red-700 border-red-100',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    outline: 'bg-transparent border-slate-300 text-slate-600'
};

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'neutral',
    className = '',
    icon: Icon
}) => {
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${variants[variant]} ${className}`}
        >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {children}
        </span>
    );
};
