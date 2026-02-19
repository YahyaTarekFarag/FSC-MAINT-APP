import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useSovereignSchema } from '../../hooks/useSovereignSchema';
import {
    Loader2,
    Edit3,
    Plus,
    Search,
    Trash2 as TrashIcon,
    AlertCircle,
    Calendar,
    Inbox,
    Check,
    X as XIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { SovereignActionModal } from './SovereignActionModal';

interface SovereignTableProps {
    schemaKey: string;
    tableName: string;
    onRowClick?: (item: any) => void;
}

const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const SovereignTable: React.FC<SovereignTableProps> = ({
    schemaKey,
    tableName,
    onRowClick
}) => {
    const { schema, loading: schemaLoading } = useSovereignSchema(schemaKey);
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [modalConfig, setModalConfig] = useState<{ mode: 'add' | 'edit'; item: any } | null>(null);

    // 1. Debounce logic
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: records, error } = await supabase
                .from(tableName)
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setData(records || []);
        } catch (err) {
            toast.error('فشل تحميل البيانات من السحابة');
        } finally {
            setLoading(false);
        }
    }, [tableName]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSoftDelete = async (id: string) => {
        const promise = (supabase
            .from(tableName as any)
            .update({ is_active: false } as any)
            .eq('id', id)) as any;

        await toast.promise(promise, {
            loading: 'جاري حذف السجل من السجل السيادي...',
            success: 'تم الحذف بنجاح (نقل للأرشفة)',
            error: 'فشل حذف السجل'
        });

        fetchData();
    };

    const filteredData = useMemo(() => {
        if (!debouncedSearch) return data || [];
        const searchStr = debouncedSearch.toLowerCase();
        return (data || []).filter(item => {
            return schema?.list_config?.columns?.some(col =>
                String(getNestedValue(item, col.key) || '').toLowerCase().includes(searchStr)
            );
        });
    }, [data, debouncedSearch, schema]);

    if (schemaLoading || loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem]">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            <p className="text-white/40 font-black tracking-widest uppercase text-xs">جاري المزامنة مع السحابة السيادية...</p>
        </div>
    );

    if (!schema) return (
        <div className="bg-red-500/10 border border-red-500/20 p-10 rounded-[2.5rem] flex items-center gap-4 text-white">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <div>
                <h3 className="font-black text-red-500">خطأ في التكوين</h3>
                <p className="text-sm text-white/60">لم يتم العثور على خريطة البيانات السيادية: {schemaKey}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="relative flex-1 w-full max-w-xl group">
                    <Search className="absolute ps-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="البحث في القواعد السيادية..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full ps-14 pe-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500 transition-all font-bold"
                    />
                </div>

                {schema?.list_config?.allowAdd && (
                    <button
                        onClick={() => setModalConfig({ mode: 'add', item: null })}
                        className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:translate-y-[-2px] hover:shadow-xl hover:shadow-blue-500/20 active:scale-95 transition-all w-full md:w-auto justify-center"
                    >
                        <Plus className="w-6 h-6" />
                        إضافة {schema?.title} جديد
                    </button>
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl group">
                <table className="w-full text-right">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            {schema?.list_config?.columns?.map(col => (
                                <th key={col.key} className="px-8 py-7 text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-8 py-7 text-white/30 text-[10px] font-black uppercase tracking-[0.3em] text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {(!filteredData || filteredData.length === 0) ? (
                            <tr>
                                <td colSpan={(schema?.list_config?.columns?.length || 0) + 1} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-4 opacity-20">
                                        <Inbox className="w-16 h-16" />
                                        <p className="font-black text-xl">السجل فارغ حالياً</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredData?.map(item => (
                                <tr
                                    key={item.id}
                                    onClick={() => onRowClick?.(item)}
                                    className="hover:bg-white/5 transition-colors cursor-pointer group/row"
                                >
                                    {schema?.list_config?.columns?.map(col => (
                                        <td key={col.key} className="px-8 py-6">
                                            {renderCell(item, col)}
                                        </td>
                                    ))}
                                    <td className="px-8 py-6" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-2">
                                            {schema?.list_config?.actions?.map(action => (
                                                <button
                                                    key={action.id}
                                                    onClick={() => action.id === 'delete' ? handleSoftDelete(item.id) : setModalConfig({ mode: 'edit', item })}
                                                    className={`p-2.5 rounded-xl border transition-all ${action.id === 'delete' ? 'text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white' :
                                                        'text-blue-400 border-blue-500/20 hover:bg-blue-600 hover:text-white'
                                                        }`}
                                                    title={action.label}
                                                >
                                                    {action.id === 'delete' ? <TrashIcon className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {filteredData?.map(item => (
                    <div
                        key={item.id}
                        className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] space-y-4 shadow-xl"
                    >
                        <div className="flex justify-between items-start border-b border-white/5 pb-4">
                            <div>
                                <h4 className="text-white font-black text-lg">{getNestedValue(item, schema?.list_config?.columns?.[0]?.key || '')}</h4>
                                <p className="text-white/40 text-xs font-bold mt-1">المعرف: {item.id.slice(0, 8)}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setModalConfig({ mode: 'edit', item })}
                                    className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20"
                                >
                                    <Edit3 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleSoftDelete(item.id)}
                                    className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {schema?.list_config?.columns?.slice(1)?.map(col => (
                                <div key={col.key}>
                                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">{col.label}</p>
                                    <div className="mt-1 text-sm font-bold text-white/80">{renderCell(item, col)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {modalConfig && (
                <SovereignActionModal
                    schema={schema}
                    tableName={tableName}
                    mode={modalConfig.mode}
                    item={modalConfig.item}
                    onClose={() => setModalConfig(null)}
                    onSuccess={() => {
                        setModalConfig(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

const renderCell = (item: any, col: any) => {
    const value = getNestedValue(item, col.key);

    switch (col.type) {
        case 'date':
            return (
                <div className="flex items-center gap-2 text-white/60 font-mono text-sm">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    {value ? new Date(value).toLocaleDateString('ar-EG') : '-'}
                </div>
            );
        case 'badge':
            const color = col.colors?.[value] || 'blue';
            return (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border
                    ${color === 'red' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        color === 'green' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'}
                `}>
                    {value}
                </span>
            );
        case 'boolean':
            return value ? (
                <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold">
                    <Check className="w-4 h-4 bg-emerald-500/10 rounded-full p-0.5" />
                    نشط
                </div>
            ) : (
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
                    <XIcon className="w-4 h-4 bg-red-500/10 rounded-full p-0.5" />
                    غير نشط
                </div>
            );
        default:
            return <span className="text-white font-bold">{value || '-'}</span>;
    }
};
