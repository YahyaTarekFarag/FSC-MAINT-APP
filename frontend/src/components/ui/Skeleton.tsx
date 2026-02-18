
import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    width,
    height,
    variant = 'rectangular'
}) => {
    const baseStyles = "animate-pulse bg-slate-200/80";

    const variantStyles = {
        text: "rounded h-4 w-3/4",
        circular: "rounded-full",
        rectangular: "rounded-xl"
    };

    return (
        <div
            className={`${baseStyles} ${variantStyles[variant]} ${className}`}
            style={{ width, height }}
        />
    );
};
