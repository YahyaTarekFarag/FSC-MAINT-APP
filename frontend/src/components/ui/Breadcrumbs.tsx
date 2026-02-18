import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BreadcrumbsProps {
    items?: { label: string; path?: string }[];
    className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
    const location = useLocation();

    // If no items provided, try to auto-generate from path (simple version)
    // For robust apps, explicit items are usually better to handle IDs vs Names

    return (
        <nav className={cn("flex items-center gap-2 text-sm text-slate-500 mb-6", className)} aria-label="Breadcrumb">
            <Link
                to="/dashboard"
                className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                title="الرئيسية"
            >
                <Home className="w-4 h-4" />
            </Link>

            {items && items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <ChevronLeft className="w-4 h-4 text-slate-300 rtl:rotate-180" />
                    {item.path ? (
                        <Link
                            to={item.path}
                            className="hover:text-blue-600 transition-colors font-medium"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="font-bold text-slate-900">{item.label}</span>
                    )}
                </div>
            ))}
        </nav>
    );
};
