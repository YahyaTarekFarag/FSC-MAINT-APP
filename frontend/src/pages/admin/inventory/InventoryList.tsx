import { useState } from 'react';
import { Package, Upload, Download, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SovereignTable } from '../../../components/tickets/SovereignTable';
import { SovereignActionModal } from '../../../components/ui/SovereignActionModal';
import { useSovereignMutation } from '../../../hooks/useSovereignMutation';
import { useSovereignQuery } from '../../../hooks/useSovereignQuery';
import { useSovereignSchema } from '../../../hooks/useSovereignSchema';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const InventoryList = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [modalAction, setModalAction] = useState<'add' | 'edit'>('add');
    const [searchTerm, setSearchTerm] = useState('');

    const { schema, loading: schemaLoading } = useSovereignSchema('inventory_management_v1');

    const { data: parts, loading, refetch } = useSovereignQuery({
        table: 'inventory',
        showArchived: false,
        orderBy: { column: 'part_name', ascending: true },
        search: searchTerm,
        searchColumns: ['part_name', 'sku']
    });

    const { softDeleteRecord, restoreRecord } = useSovereignMutation({ table_name: 'inventory' });

    const handleAction = async (action: string, item: any) => {
        if (action === 'add') {
            setSelectedItem(null);
            setModalAction('add');
            setIsModalOpen(true);
        } else if (action === 'edit') {
            setSelectedItem(item);
            setModalAction('edit');
            setIsModalOpen(true);
        } else if (action === 'delete') {
            if (window.confirm(`هل أنت متأكد من إيقاف القطعة: ${item.part_name}؟`)) {
                const { error } = await softDeleteRecord(item.id);
                if (!error) refetch();
            }
        } else if (action === 'restore') {
            const { error } = await restoreRecord(item.id);
            if (!error) refetch();
        }
    };

    const handleExport = () => {
        const dataToExport = parts.map(p => ({
            'الاسم': p.part_name,
            'SKU': p.sku,
            'الكمية': p.quantity,
            'السعر': p.price,
            'الحالة': p.is_active ? 'نشط' : 'متوقف'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, "Sovereign_Inventory.xlsx");
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        toast.loading('جاري استيراد البيانات...');
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            let successCount = 0;
            for (const row of jsonData) {
                const partData = {
                    part_name: row['الاسم'] || row['part_name'],
                    sku: row['SKU'] || row['sku'],
                    quantity: parseInt(row['الكمية'] || row['quantity'] || '0'),
                    price: parseFloat(row['السعر'] || row['price'] || '0'),
                    is_active: true
                };

                const { error } = await supabase.from('inventory').upsert(partData as any, { onConflict: 'sku' });
                if (!error) successCount++;
            }

            toast.dismiss();
            toast.success(`تم استيراد ${successCount} قطعة بنجاح`);
            refetch();
        } catch (err) {
            toast.dismiss();
            toast.error('فشل في معالجة الملف');
        }
    };

    const kpiData = {
        total: parts.length,
        active: parts.filter(p => p.is_active).length,
        totalValue: parts.reduce((acc, p) => acc + (p.price * p.quantity), 0)
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700 font-sans rtl" dir="rtl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 w-full">
                    <div className="flex items-center gap-8 flex-1">
                        <button
                            onClick={() => navigate('/admin/console')}
                            className="bg-white/5 p-4 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group"
                        >
                            <ArrowRight className="w-6 h-6 text-white group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="bg-indigo-600/20 p-5 rounded-[2rem] border border-indigo-500/30">
                            <Package className="w-12 h-12 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black text-white tracking-tighter">الخزينة السيادية</h1>
                            <p className="text-white/40 text-xl font-medium mt-2">إدارة المخزون والقطع الإستراتيجية</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-3 px-6 py-4 rounded-2xl font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all cursor-pointer">
                            <Upload className="w-5 h-5" />
                            استيراد
                            <input type="file" className="hidden" onChange={handleImport} />
                        </label>

                        <button
                            onClick={handleExport}
                            className="flex items-center gap-3 px-6 py-4 rounded-2xl font-black bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all"
                        >
                            <Download className="w-5 h-5" />
                            تصدير
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem]">
                    <p className="text-white/40 font-bold mb-2">إجمالي الأصناف</p>
                    <h3 className="text-4xl font-black text-white">{kpiData.total}</h3>
                </div>
                <div className="bg-indigo-500/10 backdrop-blur-xl border border-indigo-500/20 p-8 rounded-[2.5rem]">
                    <p className="text-indigo-400 font-bold mb-2">الأصناف النشطة</p>
                    <h3 className="text-4xl font-black text-indigo-500">{kpiData.active}</h3>
                </div>
                <div className="bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 p-8 rounded-[2.5rem]">
                    <p className="text-emerald-400 font-bold mb-2">قيمة المخزون</p>
                    <h3 className="text-4xl font-black text-emerald-500">{kpiData.totalValue.toLocaleString()} ج.م</h3>
                </div>
            </div>

            {/* Table Section */}
            <div className="relative">
                <SovereignTable
                    schemaKey="inventory_management_v1"
                    data={parts}
                    loading={loading || schemaLoading}
                    onAction={handleAction}
                    searchTerm={searchTerm}
                    onSearch={setSearchTerm}
                />
            </div>

            {/* Action Modal */}
            {isModalOpen && schema && (
                <SovereignActionModal
                    schema={schema}
                    tableName="inventory"
                    mode={modalAction}
                    item={selectedItem}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        refetch();
                    }}
                />
            )}
        </div>
    );
};

export default InventoryList;
