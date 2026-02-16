import React, { useState, useEffect } from 'react';
import {
    Package,
    Plus,
    Search,
    AlertTriangle,
    ArrowRight,
    Filter,
    MoreVertical,
    History,
    TrendingUp,
    TrendingDown,
    Loader2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useNavigate } from 'react-router-dom';

// Types
type SparePart = {
    id: number;
    name_ar: string;
    part_number: string | null;
    quantity: number;
    min_threshold: number;
    price: number;
    image_url: string | null;
    category_id: string | null;
};

type Category = {
    id: string;
    name_ar: string;
};

const InventoryList = () => {
    const navigate = useNavigate();
    const [parts, setParts] = useState<SparePart[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showRestockModal, setShowRestockModal] = useState(false);
    const [selectedPart, setSelectedPart] = useState<SparePart | null>(null);
    const [restockAmount, setRestockAmount] = useState<number>(1);
    const [submitting, setSubmitting] = useState(false);

    // New Part Form State
    const [newPart, setNewPart] = useState({
        name_ar: '',
        part_number: '',
        quantity: 0,
        min_threshold: 5,
        price: 0,
        category_id: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [partsRes, catsRes] = await Promise.all([
                supabase.from('spare_parts').select('*').order('name_ar'),
                supabase.from('fault_categories').select('id, name_ar').eq('is_active', true)
            ]);

            if (partsRes.error) throw partsRes.error;
            if (catsRes.error) throw catsRes.error;

            setParts(partsRes.data || []);
            setCategories(catsRes.data || []);
        } catch (err) {
            console.error('Error fetching inventory data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPart = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { error } = await supabase.from('spare_parts').insert({
                ...newPart,
                category_id: newPart.category_id || null
            });

            if (error) throw error;

            await fetchInitialData();
            setShowAddModal(false);
            setNewPart({
                name_ar: '',
                part_number: '',
                quantity: 0,
                min_threshold: 5,
                price: 0,
                category_id: ''
            });
        } catch (err) {
            console.error('Error adding part:', err);
            alert('فشل في إضافة القطعة');
        } finally {
            setSubmitting(false);
        }
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
            const { error } = await supabase.from('inventory_transactions').insert({
                part_id: selectedPart.id,
                user_id: user.id,
                change_amount: restockAmount,
                transaction_type: 'restock',
                notes: 'Manual restock from Admin Console'
            });

            if (error) throw error;

            await fetchInitialData();
            setShowRestockModal(false);
            setSelectedPart(null);
            setRestockAmount(1);
        } catch (err) {
            console.error('Error restocking:', err);
            alert('فشل في إعادة التخزين');
        } finally {
            setSubmitting(false);
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
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                    <Plus className="w-5 h-5" />
                    إضافة قطعة جديدة
                </button>
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-slate-500 font-bold text-sm">تفاصيل القطعة</th>
                                <th className="px-6 py-4 text-slate-500 font-bold text-sm">التصنيف</th>
                                <th className="px-6 py-4 text-slate-500 font-bold text-sm">الكمية</th>
                                <th className="px-6 py-4 text-slate-500 font-bold text-sm">السعر</th>
                                <th className="px-6 py-4 text-slate-500 font-bold text-sm">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                                    </td>
                                </tr>
                            ) : filteredParts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">
                                        لا توجد قطع مطابقة للبحث
                                    </td>
                                </tr>
                            ) : filteredParts.map((part) => (
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
                                        <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                                            {categories.find(c => c.id === part.category_id)?.name_ar || 'عام'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold ${part.quantity <= part.min_threshold ? 'text-red-600' : 'text-slate-700'}`}>
                                                {part.quantity}
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
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                                                <History className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Part Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">إضافة قطعة جديدة</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <Search className="w-5 h-5 text-slate-400 rotate-45" /> {/* Close Icon */}
                            </button>
                        </div>

                        <form onSubmit={handleAddPart} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">اسم القطعة</label>
                                <input
                                    required
                                    type="text"
                                    value={newPart.name_ar}
                                    onChange={e => setNewPart({ ...newPart, name_ar: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">رقم القطعة (SKU)</label>
                                    <input
                                        type="text"
                                        value={newPart.part_number}
                                        onChange={e => setNewPart({ ...newPart, part_number: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">التصنيف</label>
                                    <select
                                        value={newPart.category_id}
                                        onChange={e => setNewPart({ ...newPart, category_id: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium bg-white"
                                    >
                                        <option value="">عام</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name_ar}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">الكمية الأولية</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newPart.quantity}
                                        onChange={e => setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 0 })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">الحد الأدنى</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newPart.min_threshold}
                                        onChange={e => setNewPart({ ...newPart, min_threshold: parseInt(e.target.value) || 0 })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">السعر</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newPart.price}
                                        onChange={e => setNewPart({ ...newPart, price: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 font-medium"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex justify-center items-center gap-2"
                            >
                                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                                حفظ القطعة
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
        </div>
    );
};

export default InventoryList;
