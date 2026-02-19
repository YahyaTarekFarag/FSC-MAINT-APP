import React, { useState } from 'react';
import { useUISchema } from '../../hooks/useUISchema';
import {
    Loader2,
    MoreVertical,
    Eye,
    Inbox,
    Calendar,
    AlertCircle,
    MessageCircle,
    Edit3,
    Plus,
    Building2,
    Search,
    CheckSquare,
    Archive,
    RotateCcw,
    Filter,
    X,
    Trash2 as TrashIcon
} from 'lucide-react';

interface SovereignTableProps {
    schemaKey: string;
    data: Record<string, any>[];
    loading?: boolean;
    onAction?: (action: string, item: any) => void;
    onSearch?: (term: string) => void;
    onBatchAction?: (action: string, ids: string[]) => void;
    searchTerm?: string;
}

const getNestedValue = (obj: Record<string, any>, path: string): any => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const SovereignTable: React.FC<SovereignTableProps> = ({
    schemaKey,
    data,
    loading: dataLoading,
    onAction,
    onSearch,
    onBatchAction,
    searchTerm = ''
}) => {
    const { schema, loading: schemaLoading } = useUISchema(schemaKey);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [filterVisible, setFilterVisible] = useState(false);
    const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

    const toggleSelectAll = () => {
        if (selectedIds.length === data.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(data.map(item => item.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

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
                <h3 className="font-black text-white">تنبيه المعالجة</h3>
                <p className="text-sm text-white/60">لم يتم العثور على تكوين العرض السيادي لهذا النموذج</p>
            </div>
        </div>
    );

    const config = schema.list_config || {};
    const columns = Array.isArray(config.columns) ? config.columns : [];
    const actions = Array.isArray(config.actions) ? config.actions : [];

    const filteredData = (data as any[]).filter(item => {
        // Search term filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = columns.some(col => {
                const val = getNestedValue(item, col.key);
                return String(val || '').toLowerCase().includes(searchLower);
            });
            if (!matchesSearch) return false;
        }

        // Active filters (Smart Filter)
        return Object.entries(activeFilters).every(([key, value]) => {
            if (!value) return true;
            const itemValue = getNestedValue(item, key);
            return String(itemValue || '') === value;
        });
    });

    const renderCell = (item: Record<string, any>, col: any) => {
        const value = getNestedValue(item, col.key);

        switch (col.type) {
            case 'date':
                return (
                    <div className="flex items-center gap-2 text-white/40">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span className="text-sm md:text-base font-mono font-black leading-none">{value ? new Date(value).toLocaleDateString('ar-EG') : '-'}</span>
                    </div>
                );
            case 'badge': {
                const color = col.colors?.[value] || 'slate';
                const colorMap: Record<string, string> = {
                    red: 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]',
                    yellow: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
                    green: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
                    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
                    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
                    slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                };

                let finalColor = colorMap[color] || colorMap.slate;
                let isCritical = false;

                if (value === 'critical' || value === 'urgent' || value === 'high') {
                    finalColor = colorMap.red;
                    isCritical = true;
                } else if (value === 'closed' || value === 'resolved') {
                    finalColor = colorMap.green;
                } else if (value === 'in_progress') {
                    finalColor = colorMap.blue;
                } else if (value === 'open' || value === 'pending') {
                    finalColor = colorMap.yellow;
                }

                return (
                    <span className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-black border uppercase tracking-tighter shadow-lg transition-all duration-300 ${finalColor} ${isCritical ? 'animate-pulse' : ''}`}>
                        {value}
                    </span>
                );
            }
            default: {
                if (col.key === 'branch.name_ar' || col.key === 'branch_id') {
                    return (
                        <div className="flex items-center gap-2 group/entity">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg group-hover/entity:bg-blue-500 group-hover/entity:text-white transition-all">
                                <Building2 className="w-3 h-3" />
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction?.('view_branch', item);
                                }}
                                className="text-blue-400 hover:text-blue-300 font-black text-base md:text-lg tracking-tight leading-tight underline decoration-blue-500/30 underline-offset-4 hover:decoration-blue-400 transition-all text-right"
                            >
                                {value || '-'}
                            </button>
                        </div>
                    );
                }

                return <span className="text-white font-black text-base md:text-lg tracking-tight leading-tight">{value || '-'}</span>;
            }
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 space-y-6 relative">
            {/* Batch Action Bar (Floating) */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 border border-white/10 px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 animate-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/30">
                            {selectedIds.length}
                        </div>
                        <span className="text-white font-bold text-lg tracking-tight">سجل مختار</span>
                    </div>

                    <div className="h-8 w-px bg-white/10"></div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                onBatchAction?.('archive', selectedIds);
                                setSelectedIds([]);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 transition-all font-bold text-sm"
                        >
                            <Archive className="w-4 h-4 text-amber-500" />
                            أرشفة الكل
                        </button>
                        <button
                            onClick={() => {
                                onBatchAction?.('delete', selectedIds);
                                setSelectedIds([]);
                            }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all font-bold text-sm"
                        >
                            <TrashIcon className="w-4 h-4" />
                            حذف الكل
                        </button>
                        <button
                            onClick={() => setSelectedIds([])}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )
            }

            {/* Toolbar Section */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-1 items-center gap-4 max-w-xl group">
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 text-white/20 absolute right-5 top-4.5 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="البحث الذكي في السجلات..."
                                value={searchTerm}
                                onChange={(e) => onSearch?.(e.target.value)}
                                className="w-full pr-14 pl-6 py-4 rounded-2xl bg-white/5 border border-white/20 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all font-black"
                            />
                        </div>
                        <button
                            onClick={() => setFilterVisible(!filterVisible)}
                            className={`p-4 rounded-2xl border transition-all ${filterVisible ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/20 text-white/40 hover:text-white'}`}
                            title="الفلاتر المتقدمة"
                        >
                            <Filter className="w-6 h-6" />
                        </button>
                    </div>

                    {config.allowAdd && (
                        <button
                            onClick={() => onAction?.('add', null)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-900/40 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3 group"
                        >
                            <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                            إضافة جديد
                        </button>
                    )}
                </div>

                {/* Smart Filter Drawer */}
                {filterVisible && (
                    <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
                        {columns.filter((c: any) => c.type === 'badge' || (c.key && (c.key.includes('status') || c.key.includes('branch')))).map((col: any) => {
                            const uniqueValues = Array.from(new Set(data.map(item => getNestedValue(item as any, col.key)).filter(Boolean)));
                            return (
                                <div key={col.key} className="space-y-2">
                                    <label className="text-[10px] text-white/20 font-black uppercase tracking-widest px-2">{col.label}</label>
                                    <select
                                        value={activeFilters[col.key] || ''}
                                        onChange={(e) => setActiveFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-blue-500 transition-all"
                                    >
                                        <option value="">الكل</option>
                                        {uniqueValues.map(val => (
                                            <option key={val} value={val}>{val}</option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                        <div className="flex items-end">
                            <button
                                onClick={() => setActiveFilters({})}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all text-xs font-black"
                            >
                                <RotateCcw className="w-4 h-4" />
                                إعادة ضبط
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {
                (!data || data.length === 0) ? (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-20 rounded-[2.5rem] flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                            <Inbox className="w-10 h-10 text-white/20" />
                        </div>
                        <div>
                            <h3 className="text-white font-black text-xl">لا توجد سجلات</h3>
                            <p className="text-white/40 text-base font-bold">لم يتم العثور على أي بيانات حالياً</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Desktop View */}
                        <div className="hidden md:block overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                            <table className="w-full text-right border-collapse relative z-10">
                                <thead className="bg-white/5 border-b border-white/10">
                                    <tr>
                                        <th className="px-8 py-7 w-14">
                                            <button
                                                onClick={toggleSelectAll}
                                                className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${selectedIds.length === data.length && data.length > 0
                                                    ? 'bg-blue-600 border-blue-500 text-white'
                                                    : 'bg-white/5 border-white/10 text-transparent hover:border-white/30'
                                                    }`}
                                            >
                                                <CheckSquare className="w-4 h-4" />
                                            </button>
                                        </th>
                                        {columns.map((col: any) => (
                                            <th key={col.key} className="px-8 py-7 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] leading-none text-right">
                                                {col.label}
                                            </th>
                                        ))}
                                        <th className="px-8 py-7 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] leading-none text-right">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredData.map((item) => (
                                        <tr
                                            key={item.id}
                                            onClick={() => onAction?.('view', item)}
                                            className={`transition-all duration-300 group cursor-pointer ${selectedIds.includes(item.id) ? 'bg-blue-500/10' : 'hover:bg-white/5'
                                                }`}
                                        >
                                            <td className="px-8 py-7" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => toggleSelect(item.id)}
                                                    className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${selectedIds.includes(item.id)
                                                        ? 'bg-blue-600 border-blue-500 text-white'
                                                        : 'bg-white/5 border-white/20 text-transparent group-hover:border-white/40'
                                                        }`}
                                                >
                                                    <CheckSquare className="w-4 h-4" />
                                                </button>
                                            </td>
                                            {columns.map((col: any) => (
                                                <td key={col.key} className="px-8 py-7">
                                                    {renderCell(item, col)}
                                                </td>
                                            ))}
                                            <td className="px-8 py-7" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                    {actions.map((action: any) => (
                                                        <button
                                                            key={action.id}
                                                            onClick={() => onAction?.(action.id, item)}
                                                            className={`p-2.5 rounded-xl transition-all hover:scale-110 border ${action.id === 'delete' ? 'text-red-400 border-red-500/20 bg-red-500/10 hover:border-red-500/50' :
                                                                action.id === 'whatsapp' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 hover:border-emerald-500/50' :
                                                                    action.id === 'edit' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10 hover:border-amber-500/50' :
                                                                        'text-white/40 border-white/10 bg-white/5 hover:text-white hover:border-white/30'
                                                                }`}
                                                            title={action.label}
                                                        >
                                                            {action.id === 'view' || action.icon === 'eye' ? <Eye className="w-4 h-4" /> :
                                                                action.id === 'edit' || action.icon === 'edit' ? <Edit3 className="w-4 h-4" /> :
                                                                    action.id === 'delete' || action.icon === 'trash' ? <TrashIcon className="w-4 h-4" /> :
                                                                        action.id === 'whatsapp' || action.icon === 'message-circle' ? <MessageCircle className="w-4 h-4" /> :
                                                                            <MoreVertical className="w-4 h-4" />}
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
                            {filteredData.map((item) => (
                                <div
                                    key={item.id}
                                    className={`bg-white/5 backdrop-blur-xl border p-6 rounded-[2rem] space-y-6 active:scale-[0.98] transition-all ${selectedIds.includes(item.id) ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10'
                                        }`}
                                    onClick={() => onAction?.('view', item)}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelect(item.id);
                                                }}
                                                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${selectedIds.includes(item.id)
                                                    ? 'bg-blue-600 border-blue-500 text-white'
                                                    : 'bg-white/5 border-white/10 text-transparent'
                                                    }`}
                                            >
                                                <CheckSquare className="w-5 h-5" />
                                            </button>
                                            <div className="space-y-4">
                                                {columns.slice(0, 2).map((col) => (
                                                    <div key={col.key}>
                                                        <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">{col.label}</p>
                                                        <div className="mt-1">{renderCell(item, col)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-4">
                                            {(() => {
                                                const badgeCol = columns.find(c => c.type === 'badge');
                                                return badgeCol ? renderCell(item, badgeCol) : null;
                                            })()}
                                            <button
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-3 bg-white/5 rounded-2xl border border-white/10"
                                            >
                                                <MoreVertical className="w-5 h-5 text-white/40" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )
            }
        </div >
    );
};

