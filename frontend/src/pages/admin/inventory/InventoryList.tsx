import { useState, useEffect } from 'react';
import { Plus, Search, Filter, AlertTriangle, Package, TrendingUp, X, Edit, Loader2, Upload, Download, ArrowRight, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { logActivity } from '../../../lib/api';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';

// Types
type SparePart = {
    id: number;
    name_ar: string;
    part_number: string | null;
    description: string | null;
    quantity: number;
    min_threshold: number;
    price: number;
    location: string | null;
    supplier: string | null;
    compatible_models: string | null;
    image_url: string | null;
    category_id: string | null;
    unit_id: number | null;
    unit_types?: {
        name_ar: string;
    };
    category?: {
        name_ar: string;
    };
};

type Category = {
    id: string;
    name_ar: string;
};

type UnitType = {
    id: number;
    name_ar: string;
};

const InventoryList = () => {
    const navigate = useNavigate();
    const [parts, setParts] = useState<SparePart[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [units, setUnits] = useState<UnitType[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    // Restock / Modal State
    const [showRestockModal, setShowRestockModal] = useState(false);
    const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
    const [restockAmount, setRestockAmount] = useState<number>(1);
    const [submitting, setSubmitting] = useState(false);

    // Delete Modal State
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name_ar: '',
        part_number: '',
        description: '',
        quantity: 0,
        min_threshold: 5,
        price: 0,
        location: '',
        supplier: '',
        compatible_models: '',
        category_id: '',
        unit_id: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [partsRes, catsRes, unitsRes] = await Promise.all([
                supabase.from('spare_parts').select(`
                    *,
                    unit_types (name_ar)
                `).order('name_ar'),
                supabase.from('fault_categories').select('id, name_ar').eq('is_active', true),
                supabase.from('unit_types').select('*').order('name_ar')
            ]);

            if (partsRes.error) throw partsRes.error;
            if (catsRes.error) throw catsRes.error;
            if (unitsRes.error) throw unitsRes.error;

            setParts(partsRes.data as any || []);
            setCategories(catsRes.data || []);
            setUnits(unitsRes.data || []);
        } catch (err) {
            console.error('Error fetching inventory data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                name_ar: formData.name_ar,
                part_number: formData.part_number,
                description: formData.description,
                quantity: formData.quantity,
                min_threshold: formData.min_threshold,
                price: formData.price,
                location: formData.location,
                supplier: formData.supplier,
                compatible_models: formData.compatible_models,
                category_id: formData.category_id || null,
                unit_id: formData.unit_id ? parseInt(formData.unit_id) : null
            };

            if (modalMode === 'add') {
                const { data, error } = await (supabase.from('spare_parts') as any).insert(payload).select().single();
                if (error) throw error;
                setParts([data as any, ...parts]);
                toast.success('تم إضافة قطعة الغيار بنجاح');
            } else {
                if (!selectedPart) return;
                const { data, error } = await (supabase
                    .from('spare_parts') as any)
                    .update(payload)
                    .eq('id', selectedPart.id)
                    .select()
                    .single();
                if (error) throw error;
                setParts(parts.map(p => (p.id === selectedPart.id ? data as any : p)));
                toast.success('تم تحديث قطعة الغيار بنجاح');
            }

            await fetchInitialData();
            setShowModal(false);
            resetForm();
        } catch (err) {
            console.error('Error saving part:', err);
            toast.error('فشل في حفظ البيانات');
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name_ar: '',
            part_number: '',
            description: '',
            quantity: 0,
            min_threshold: 5,
            price: 0,
            location: '',
            supplier: '',
            compatible_models: '',
            category_id: '',
            unit_id: ''
        });
        setSelectedPart(null);
    };

    const openEditModal = (part: SparePart) => {
        setSelectedPart(part);
        setFormData({
            name_ar: part.name_ar,
            part_number: part.part_number || '',
            description: part.description || '',
            quantity: part.quantity,
            min_threshold: part.min_threshold,
            price: part.price,
            location: part.location || '',
            supplier: part.supplier || '',
            compatible_models: part.compatible_models || '',
            category_id: part.category_id || '',
            unit_id: part.unit_id ? part.unit_id.toString() : ''
        });
        setModalMode('edit');
        setShowModal(true);
    };

    const openAddModal = () => {
        resetForm();
        setModalMode('add');
        setShowModal(true);
    };

    const handleRestock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPart || restockAmount <= 0) return;

        setSubmitting(true);
        try {
            // Get current user ID
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Create transaction (Trigger will update quantity)
            // Create transaction (Trigger will update quantity)
            const { error: transactionError } = await (supabase
                .from('inventory_transactions') as any)
                .insert({
                    part_id: selectedPart.id,
                    user_id: user.id,
                    change_amount: restockAmount,
                    transaction_type: 'restock',
                    notes: 'إعادة تعبئة يدوية'
                });

            if (transactionError) throw transactionError;

            await logActivity('UPDATE', 'PART', {
                id: selectedPart.id,
                action: 'RESTOCK',
                amount: restockAmount
            });

            await fetchInitialData();
            setShowRestockModal(false);
            setSelectedPart(null);
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
            'موديلات': p.compatible_models,
            'الوحدة': p.unit_types?.name_ar || '',
            'التصنيف': p.category?.name_ar || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventory");
        XLSX.writeFile(wb, "inventory_export.xlsx");
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            let successCount = 0;
            let failCount = 0;

            for (const row of jsonData) {
                // Basic mapping - logic can be improved to match exact columns or use fuzzy search
                // Assuming columns match Export format
                const partData = {
                    name_ar: row['الاسم'] || row['name_ar'] || 'Unknown Part',
                    part_number: row['رقم القطعة'] || row['part_number'],
                    quantity: parseInt(row['الكمية'] || row['quantity'] || '0'),
                    min_threshold: parseInt(row['الحد الأدنى'] || row['min_threshold'] || '5'),
                    price: parseFloat(row['السعر'] || row['price'] || '0'),
                    location: row['الموقع'] || row['location'],
                    supplier: row['المورد'] || row['supplier'],
                    description: row['الوصف'] || row['description'],
                    compatible_models: row['موديلات'] || row['compatible_models'],
                    // Note: Category and Unit linking requires ID lookup, skipping for simple import or default to null
                };

                // Check if exists to update or insert
                /* 
                   Strategy: If part_number exists, update. Else insert. 
                   Warning: If no part_number, might duplicate names.
                */

                let error = null;
                if (partData.part_number) {
                    const { data: existing } = await (supabase
                        .from('spare_parts') as any)
                        .select('id')
                        .eq('part_number', partData.part_number)
                        .single();

                    if (existing) {
                        const { error: err } = await (supabase.from('spare_parts') as any).update(partData).eq('id', existing.id);
                        error = err;
                    } else {
                        const { error: err } = await (supabase.from('spare_parts') as any).insert(partData);
                        error = err;
                    }
                } else {
                    const { error: err } = await (supabase.from('spare_parts') as any).insert(partData);
                    error = err;
                }

                if (error) {
                    console.error('Row Import Error:', error);
                    failCount++;
                } else {
                    successCount++;
                }
            }

            if (failCount === 0) {
                toast.success(`تم استيراد ${successCount} قطعة بنجاح ✅`);
            } else {
                toast(`تم استيراد ${successCount} بنجاح، وفشل ${failCount}`, { icon: '⚠️' });
            }
            await fetchInitialData();

        } catch (err) {
            console.error('Import process failed:', err);
            toast.error('فشل في معالجة الملف');
        } finally {
            setLoading(false);
            e.target.value = ''; // Reset input
        }
    };

    const confirmDelete = (id: number) => {
        setDeleteId(id);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.from('spare_parts').delete().eq('id', deleteId);
            if (error) throw error;
            await logActivity('DELETE', 'PART', { id: deleteId });
            toast.success('تم حذف القطعة بنجاح 🗑️');
            fetchInitialData();
        } catch (error) {
            console.error('Error deleting part:', error);
            toast.error('فشل الحذف');
        } finally {
            setIsDeleting(false);
            setDeleteId(null);
        }
    };

    const filteredParts = parts.filter(p =>
        p.name_ar.includes(searchTerm) ||
        (p.part_number && p.part_number.includes(searchTerm))
    );

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-8 font-sans" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/console')}
                        className="p-2 bg-white rounded-xl hover:bg-slate-50 border border-slate-200"
                    >
                        <ArrowRight className="w-5 h-5 text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">إدارة المخزون</h1>
                        <p className="text-slate-500 text-sm">متابعة قطع الغيار وحركات المخزون</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <label className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200 cursor-pointer">
                        <Upload className="w-5 h-5" />
                        <span className="hidden sm:inline">استيراد</span>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleImport}
                        />
                    </label>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200"
                    >
                        <Download className="w-5 h-5" />
                        <span className="hidden sm:inline">تصدير</span>
                    </button>

                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">إضافة قطعة</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Package className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm font-bold">إجمالي القطع</p>
                    <h3 className="text-3xl font-bold text-slate-900">{parts.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 rounded-xl">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm font-bold">قطع منخفضة المخزون</p>
                    <h3 className="text-3xl font-bold text-slate-900">
                        {parts.filter(p => p.quantity <= p.min_threshold).length}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm font-bold">قيمة المخزون</p>
                    <h3 className="text-3xl font-bold text-slate-900">
                        {parts.reduce((acc, p) => acc + (p.price * p.quantity), 0).toLocaleString()} ج.م
                    </h3>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="بحث باسم القطعة أو الرقم التسلسلي..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-3 outline-none focus:border-blue-500 transition-all font-medium"
                    />
                </div>
                <button className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all">
                    <Filter className="w-5 h-5" />
                </button>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-slate-500 font-bold text-sm">تفاصيل القطعة</th>
                                <th className="px-6 py-4 text-slate-500 font-bold text-sm">التصنيف</th>
                                <th className="px-6 py-4 text-slate-500 font-bold text-sm">الكمية</th>
                                <th className="px-6 py-4 text-slate-500 font-bold text-sm">السعر</th>
                                <th className="px-6 py-4 text-slate-500 font-bold text-sm">التوافق</th>
                                <th className="px-6 py-4 text-slate-500 font-bold text-sm">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                            <p className="text-slate-400 font-medium">جاري تحميل البيانات...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredParts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12">
                                        <EmptyState
                                            icon={Package}
                                            title="لا توجد قطع مطابقة"
                                            description="لم يتم العثور على أي قطع تطابق بحثك. جرب كلمات مفتاحية مختلفة أو أضف قطعة جديدة."
                                            actionLabel="إضافة قطعة جديدة"
                                            onAction={openAddModal}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredParts.map((part) => (
                                    <tr key={part.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                                    <Package className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{part.name_ar}</h4>
                                                    <p className="text-xs text-slate-500 font-mono">{part.part_number || 'No SKU'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold w-fit">
                                                    {categories.find(c => c.id === part.category_id)?.name_ar || 'عام'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold ${part.quantity <= part.min_threshold ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {part.quantity}
                                                </span>
                                                <span className="text-xs text-slate-400 font-bold">
                                                    {part.unit_types?.name_ar || 'وحدة'}
                                                </span>
                                                {part.quantity <= part.min_threshold && (
                                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="مخزون منخفض"></span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700">
                                            {part.price.toLocaleString()} ج.م
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-[150px] truncate text-xs font-medium text-slate-500" title={part.compatible_models || ''}>
                                                {part.compatible_models ? (
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 block truncate">
                                                        {part.compatible_models}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 italic">عام</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(part)}
                                                    className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                                                    title="تعديل"
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedPart(part);
                                                        setShowRestockModal(true);
                                                    }}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg tooltip"
                                                    title="إعادة تعبئة"
                                                >
                                                    <TrendingUp className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(part.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Part Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 p-8 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">
                                {modalMode === 'add' ? 'إضافة قطعة جديدة' : 'تعديل بيانات القطعة'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">اسم القطعة</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name_ar}
                                        onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">رقم القطعة (SKU)</label>
                                    <input
                                        type="text"
                                        value={formData.part_number}
                                        onChange={e => setFormData({ ...formData, part_number: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">موقع التخزين (الرف/الدرج)</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                                        placeholder="مثال: A-12"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">التصنيف</label>
                                    <select
                                        value={formData.category_id}
                                        onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium bg-white"
                                    >
                                        <option value="">عام</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name_ar}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">وحدة القياس</label>
                                    <select
                                        value={formData.unit_id}
                                        onChange={e => setFormData({ ...formData, unit_id: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium bg-white"
                                    >
                                        <option value="">اختر الوحدة</option>
                                        {units.map(u => (
                                            <option key={u.id} value={u.id}>{u.name_ar}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">الوصف / المواصفات</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium h-24 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">المورد</label>
                                    <input
                                        type="text"
                                        value={formData.supplier}
                                        onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">الموديلات المتوافقة</label>
                                    <input
                                        type="text"
                                        value={formData.compatible_models}
                                        onChange={e => setFormData({ ...formData, compatible_models: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                                        placeholder="مثال: HP-200, Canon-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">الكمية</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">الحد الأدنى</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.min_threshold}
                                        onChange={e => setFormData({ ...formData, min_threshold: parseInt(e.target.value) || 0 })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">السعر</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium bg-white"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex justify-center items-center gap-2"
                            >
                                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                                {modalMode === 'add' ? 'حفظ القطعة' : 'حفظ التعديلات'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Restock Modal */}
            {showRestockModal && selectedPart && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 p-8 space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="w-8 h-8 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">إعادة تعبئة المخزون</h2>
                            <p className="text-slate-500 mt-2 font-medium">{selectedPart.name_ar}</p>
                        </div>

                        <form onSubmit={handleRestock} className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                                <span className="text-slate-500 font-bold">المخزون الحالي</span>
                                <span className="text-xl font-bold text-slate-900">{selectedPart.quantity}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">الكمية المضافة</label>
                                <input
                                    autoFocus
                                    type="number"
                                    min="1"
                                    value={restockAmount}
                                    onChange={e => setRestockAmount(parseInt(e.target.value) || 0)}
                                    className="w-full p-4 text-center text-2xl font-bold rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex justify-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowRestockModal(false)}
                                    className="flex-1 bg-white border border-slate-200 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmDialog
                isOpen={!!deleteId}
                title="حذف قطعة غيار"
                message="هل أنت متأكد من رغبتك في حذف هذه القطعة؟ لا يمكن التراجع عن هذا الإجراء."
                confirmLabel="نعم، احذف"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleteId(null)}
            />
        </div >
    );
};

export default InventoryList;
