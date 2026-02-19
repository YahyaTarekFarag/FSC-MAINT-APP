import { useState } from 'react';
import { Package, TrendingUp, Upload, Download, ArrowRight, Archive, ArchiveRestore, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SovereignTable } from '../../../components/tickets/SovereignTable';
import { SovereignActionModal } from '../../../components/ui/SovereignActionModal';
import { useSovereignMutation } from '../../../hooks/useSovereignMutation';
import { useSovereignQuery } from '../../../hooks/useSovereignQuery';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const InventoryList = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [modalAction, setModalAction] = useState<'add' | 'edit'>('add');
    const [showArchived, setShowArchived] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Restock Modal State
    const [showRestockModal, setShowRestockModal] = useState(false);
    const [restockAmount, setRestockAmount] = useState<number>(1);
    const [submitting, setSubmitting] = useState(false);

    const { data: parts, loading, refetch } = useSovereignQuery({
        table: 'spare_parts',
        showArchived,
        orderBy: { column: 'name_ar', ascending: true },
        search: searchTerm,
        searchColumns: ['name_ar', 'part_number']
    });

    const { createRecord, updateRecord, softDeleteRecord, restoreRecord } = useSovereignMutation({ table_name: 'spare_parts' });

    const handleAction = async (action: string, item: any) => {
        if (action === 'add') {
            setSelectedItem(null);
            setModalAction('add');
            setIsModalOpen(true);
        } else if (action === 'edit') {
            setSelectedItem(item);
            setModalAction('edit');
            setIsModalOpen(true);
        } else if (action === 'restock') {
            setSelectedItem(item);
            setShowRestockModal(true);
        } else if (action === 'delete') {
            if (window.confirm(`هل أنت متأكد من أرشفة القطعة: ${item.name_ar}؟`)) {
                const { error } = await softDeleteRecord(item.id);
                if (!error) refetch();
            }
        } else if (action === 'restore') {
            const { error } = await restoreRecord(item.id);
            if (!error) refetch();
        }
    };

    const handleBatchAction = async (action: string, ids: string[]) => {
        if (action === 'archive') {
            if (window.confirm(`هل أنت متأكد من أرشفة ${ids.length} سجل؟`)) {
                const promises = ids.map(id => softDeleteRecord(id));
                await Promise.all(promises);
                toast.success('تمت الأرشفة الجماعية بنجاح');
                refetch();
            }
        }
    };

    const handleModalComplete = async (formData: any) => {
        let result;
        if (modalAction === 'add') {
            result = await createRecord(formData);
        } else {
            result = await updateRecord(selectedItem.id, formData);
        }

        if (result && !result.error) {
            setIsModalOpen(false);
            refetch();
        }
    };

    const handleRestock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || restockAmount <= 0) return;

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error: transactionError } = await (supabase
                .from('inventory_transactions') as any)
                .insert({
                    part_id: Number(selectedItem.id),
                    user_id: user.id,
                    change_amount: restockAmount,
                    transaction_type: 'restock',
                    notes: 'إعادة تعبئة سيادية'
                });

            if (transactionError) throw transactionError;

            toast.success('تمت إعادة التعبئة بنجاح');
            refetch();
            setShowRestockModal(false);
            setSelectedItem(null);
            setRestockAmount(1);
        } catch (err) {
            console.error('Error restocking:', err);
            toast.error('فشل في إعادة التخزين');
        } finally {
            setSubmitting(false);
        }
    };

    const handleExport = () => {
        const dataToExport = parts.map(p => ({
            'الاسم': p.name_ar,
            'رقم القطعة': p.part_number,
            'الكمية': p.quantity,
            'الحد الأدنى': p.min_threshold,
            'السعر': p.price,
            'الموقع': p.location,
            'المورد': p.supplier,
            'الوصف': p.description,
            'موديلات': p.compatible_models
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
                    name_ar: row['الاسم'] || row['name_ar'],
                    part_number: row['رقم القطعة'] || row['part_number'],
                    quantity: parseInt(row['الكمية'] || row['quantity'] || '0'),
                    min_threshold: parseInt(row['الحد الأدنى'] || row['min_threshold'] || '5'),
                    price: parseFloat(row['السعر'] || row['price'] || '0'),
                    location: row['الموقع'] || row['location'],
                    supplier: row['المورد'] || row['supplier'],
                    description: row['الوصف'] || row['description'],
                    compatible_models: row['موديلات'] || row['compatible_models'],
                };

                const { error } = await supabase.from('spare_parts').upsert(partData as any, { onConflict: 'part_number' });
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
        lowStock: parts.filter(p => p.quantity <= p.min_threshold).length,
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

                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all border ${showArchived
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                                }`}
                        >
                            {showArchived ? <ArchiveRestore className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                            {showArchived ? 'المخزون النشط' : 'الأرشيف'}
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Section */}
            {!showArchived && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem]">
                        <p className="text-white/40 font-bold mb-2">إجمالي الأصناف</p>
                        <h3 className="text-4xl font-black text-white">{kpiData.total}</h3>
                    </div>
                    <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 p-8 rounded-[2.5rem]">
                        <p className="text-red-400 font-bold mb-2">أصناف منخفضة</p>
                        <h3 className="text-4xl font-black text-red-500">{kpiData.lowStock}</h3>
                    </div>
                    <div className="bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 p-8 rounded-[2.5rem]">
                        <p className="text-emerald-400 font-bold mb-2">قيمة المخزون</p>
                        <h3 className="text-4xl font-black text-emerald-500">{kpiData.totalValue.toLocaleString()} ج.م</h3>
                    </div>
                </div>
            )}

            {/* Table Section */}
            <div className="relative">
                <SovereignTable
                    schemaKey="inventory_management_v1"
                    data={parts.map(p => ({
                        ...p,
                        _actions: showArchived ? ['restore'] : undefined
                    }))}
                    loading={loading}
                    onAction={handleAction}
                    onBatchAction={handleBatchAction}
                    searchTerm={searchTerm}
                    onSearch={setSearchTerm}
                />
            </div>

            {/* Action Modal */}
            <SovereignActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                schemaKey="inventory_management_v1"
                initialData={selectedItem}
                title={modalAction === 'add' ? 'إضافة صنف سيادي' : 'تعديل بيانات الصنف'}
                onComplete={handleModalComplete}
            />

            {/* Restock Custom Modal */}
            {showRestockModal && selectedItem && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-white/10 rounded-[3rem] w-full max-w-md shadow-2xl p-10 space-y-8 animate-in zoom-in-95">
                        <div className="text-center space-y-4">
                            <div className="bg-indigo-600/20 p-6 rounded-[2rem] border border-indigo-500/30 w-fit mx-auto">
                                <TrendingUp className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h2 className="text-3xl font-black text-white">تغذية المخزون</h2>
                            <p className="text-white/40 font-bold">{selectedItem.name_ar}</p>
                        </div>

                        <form onSubmit={handleRestock} className="space-y-8">
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                                <span className="text-white/40 font-bold">الرصيد الحالي</span>
                                <span className="text-2xl font-black text-white">{selectedItem.quantity}</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/40 mr-2">الكمية الجديدة</label>
                                <input
                                    autoFocus
                                    type="number"
                                    min="1"
                                    value={restockAmount}
                                    onChange={e => setRestockAmount(parseInt(e.target.value) || 0)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-3xl font-black text-white focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-indigo-600 text-white p-6 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد العملية'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowRestockModal(false)}
                                    className="flex-1 bg-white/5 text-white p-6 rounded-2xl font-black border border-white/10 hover:bg-white/10 transition-all"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryList;
