
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-3xl border border-slate-100 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all active:scale-[0.99]' : ''
                } ${className}`}
        >
            {children}
        </div>
    );
};
