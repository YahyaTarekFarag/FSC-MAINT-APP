import React from 'react';
import { useUISchema } from '../../hooks/useUISchema';
import {
    Loader2,
    MoreVertical,
    Eye,
    Inbox,
    Calendar,
    AlertCircle
} from 'lucide-react';

interface SovereignTableProps {
    schemaKey: string;
    data: any[];
    loading?: boolean;
    onAction?: (action: string, item: any) => void;
}

const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const SovereignTable: React.FC<SovereignTableProps> = ({ schemaKey, data, loading: dataLoading, onAction }) => {
    const { schema, loading: schemaLoading } = useUISchema(schemaKey);

    if (schemaLoading || dataLoading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem]">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-white/40 font-bold">جاري استدعاء البيانات السيادية...</p>
        </div>
    );

    if (!schema || !schema.list_config) return (
        <div className="bg-amber-500/20 backdrop-blur-md border border-amber-500/40 p-10 rounded-[2.5rem] flex items-center gap-4 text-white">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <div>
                <h3 className="font-bold">تنبيه المعالجة</h3>
                <p className="text-sm opacity-80">لم يتم العثور على تكوين العرض السيادي لهذا النموذج</p>
            </div>
        </div>
    );

    const { columns, actions } = schema.list_config;

    const renderCell = (item: any, col: any) => {
        const value = getNestedValue(item, col.key);

        switch (col.type) {
            case 'date':
                return (
                    <div className="flex items-center gap-2 opacity-80 text-white/60">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-mono">{value ? new Date(value).toLocaleDateString('ar-EG') : '-'}</span>
                    </div>
                );
            case 'badge': {
                const color = col.colors?.[value] || 'slate';
                const colorMap: Record<string, string> = {
                    red: 'bg-red-500/10 text-red-400 border-red-500/20',
                    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                    slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                };
                return (
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-tighter shadow-lg ${colorMap[color] || colorMap.slate}`}>
                        {value}
                    </span>
                );
            }
            default:
                return <span className="text-white font-medium text-sm">{value || '-'}</span>;
        }
    };

    if (!data || data.length === 0) return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-20 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                <Inbox className="w-10 h-10 text-white/20" />
            </div>
            <div>
                <h3 className="text-white font-bold text-xl">لا توجد سجلات</h3>
                <p className="text-white/40 text-sm">لم يتم العثور على أي بيانات حالياً في هذا النطاق السيادي</p>
            </div>
        </div>
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Desktop View */}
            <div className="hidden md:block overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
                <table className="w-full text-right border-collapse">
                    <thead className="sticky top-0 z-20 bg-black/40 backdrop-blur-xl border-b border-white/10">
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className="px-8 py-6 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] leading-none">
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-8 py-6 text-white/40 text-[10px] font-black uppercase tracking-[0.2em] leading-none">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {data.map((item) => (
                            <tr key={item.id} className="transition-all duration-300 hover:bg-white/[0.03] group">
                                {columns.map((col) => (
                                    <td key={col.key} className="px-8 py-6">
                                        {renderCell(item, col)}
                                    </td>
                                ))}
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                        {actions.map((action) => (
                                            <button
                                                key={action.id}
                                                onClick={() => onAction?.(action.id, item)}
                                                className={`p-2.5 rounded-xl transition-all hover:scale-110 bg-white/5 border border-white/10 text-white/40 hover:text-white hover:border-white/20`}
                                                title={action.label}
                                            >
                                                {action.icon === 'eye' ? <Eye className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-4">
                {data.map((item) => (
                    <div
                        key={item.id}
                        className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] space-y-6 active:scale-[0.98] transition-all"
                        onClick={() => onAction?.('view', item)}
                    >
                        <div className="flex justify-between items-start">
                            <div className="space-y-4">
                                {columns.slice(0, 2).map((col) => (
                                    <div key={col.key}>
                                        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">{col.label}</p>
                                        <div className="mt-1">{renderCell(item, col)}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col items-end gap-4">
                                {columns.find(c => c.type === 'badge') && renderCell(item, columns.find(c => c.type === 'badge'))}
                                <button className="p-3 bg-white/5 rounded-2xl border border-white/10">
                                    <MoreVertical className="w-5 h-5 text-white/40" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
