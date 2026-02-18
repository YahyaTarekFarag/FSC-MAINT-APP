import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button'; // Assuming we have a reusable Button

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className
}) => {
    return (
        <div className={cn("flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300", className)}>
            <div className="bg-slate-50 p-4 rounded-full mb-4 ring-1 ring-slate-100 shadow-sm">
                <Icon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
            <p className="text-slate-500 max-w-sm mb-6 text-sm">{description}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} variant="outline" className="min-w-[120px]">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};
