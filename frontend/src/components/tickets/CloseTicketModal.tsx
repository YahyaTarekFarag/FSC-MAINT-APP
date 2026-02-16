import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Package, Search, Plus, Trash2, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import DynamicForm from './DynamicForm';

type CloseTicketModalProps = {
    ticketId: string;
    categoryId: string;
    onClose: () => void;
    onSuccess: () => void;
};

type SparePart = {
    id: number;
    name_ar: string;
    part_number: string | null;
    quantity: number;
    price: number;
};

type SelectedPart = SparePart & {
    used_quantity: number;
};

const CloseTicketModal: React.FC<CloseTicketModalProps> = ({ ticketId, categoryId, onClose, onSuccess }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Step 1: Inventory State
    const [parts, setParts] = useState<SparePart[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
    const [partsLoading, setPartsLoading] = useState(false);

    // Step 2: Closing Form State
    const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchParts();
    }, []);

    const fetchParts = async () => {
        setPartsLoading(true);
        try {
            const { data, error } = await supabase
                .from('spare_parts')
                .select('*')
                .gt('quantity', 0) // Only show parts in stock
                .order('name_ar');

            if (error) throw error;
            setParts(data || []);
        } catch (err) {
            console.error('Error fetching parts:', err);
        } finally {
            setPartsLoading(false);
        }
    };

    const handleAddPart = (part: SparePart) => {
        if (selectedParts.find(p => p.id === part.id)) return;
        setSelectedParts([...selectedParts, { ...part, used_quantity: 1 }]);
        setSearchTerm(''); // Clear search after adding
    };

    const handleRemovePart = (partId: number) => {
        setSelectedParts(prev => prev.filter(p => p.id !== partId));
    };

    const updatePartQuantity = (partId: number, qty: number) => {
        if (qty < 1) return;
        // Check stock limit
        const part = parts.find(p => p.id === partId);
        if (part && qty > part.quantity) {
            alert(`الكمية المتاحة فقط ${part.quantity}`);
            return;
        }
        setSelectedParts(prev => prev.map(p => p.id === partId ? { ...p, used_quantity: qty } : p));
    };

    const calculateTotalCost = () => {
        return selectedParts.reduce((acc, part) => acc + (part.price * part.used_quantity), 0);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // 1. Process Inventory Transactions
            if (selectedParts.length > 0) {
                const transactions = selectedParts.map(part => ({
                    part_id: part.id,
                    ticket_id: ticketId,
                    user_id: user.id,
                    change_amount: -part.used_quantity, // Negative for consumption
                    transaction_type: 'consumption',
                    notes: 'Used in ticket close'
                }));

                const { error: txError } = await supabase
                    .from('inventory_transactions')
                    .insert(transactions);

                if (txError) throw txError;
            }

            // 2. Fetch existing ticket form data to merge
            const { data: ticket } = await supabase
                .from('tickets')
                .select('form_data')
                .eq('id', ticketId)
                .single();

            const mergedFormData = {
                ...(ticket?.form_data || {}),
                ...formAnswers
            };

            // 3. Update Ticket
            const { error: updateError } = await supabase
                .from('tickets')
                .update({
                    status: 'closed',
                    closed_at: new Date().toISOString(),
                    repair_cost: calculateTotalCost(),
                    form_data: mergedFormData
                })
                .eq('id', ticketId);

            if (updateError) throw updateError;

            onSuccess();
        } catch (err) {
            console.error('Error closing ticket:', err);
            alert('حدث خطأ أثناء إغلاق البلاغ. الرجاء المحاولة مرة أخرى.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredParts = parts.filter(p =>
        p.name_ar.includes(searchTerm) ||
        (p.part_number && p.part_number.includes(searchTerm))
    );

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">إتمام الإصلاح وإغلاق البلاغ</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            {step === 1 ? 'خطوة 1: استهلاك قطع الغيار' : 'خطوة 2: التوثيق النهائي'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full">
                        <ArrowRight className="w-5 h-5 text-slate-400 rotate-180" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 1 ? (
                        <div className="space-y-6">
                            {/* Search Parts */}
                            <div className="relative z-20">
                                <label className="block text-sm font-bold text-slate-700 mb-2">إضافة قطع غيار مستخدمة</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="ابحث باسم القطعة..."
                                        className="w-full p-3 pl-10 rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                                    />
                                    <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                                </div>

                                {/* Dropdown Results */}
                                {searchTerm && (
                                    <div className="absolute w-full bg-white border border-slate-200 rounded-xl shadow-xl mt-2 max-h-48 overflow-y-auto">
                                        {filteredParts.length === 0 ? (
                                            <div className="p-3 text-slate-500 text-sm text-center">لا توجد نتائج</div>
                                        ) : (
                                            filteredParts.map(part => (
                                                <button
                                                    key={part.id}
                                                    onClick={() => handleAddPart(part)}
                                                    disabled={selectedParts.some(p => p.id === part.id)}
                                                    className="w-full text-right p-3 hover:bg-slate-50 flex justify-between items-center disabled:opacity-50"
                                                >
                                                    <span className="font-bold text-slate-700">{part.name_ar}</span>
                                                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">{part.price} ج.م</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Selected Parts List */}
                            <div className="space-y-3">
                                {selectedParts.length === 0 ? (
                                    <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-slate-500 text-sm">لم يتم إضافة أي قطع غيار</p>
                                    </div>
                                ) : (
                                    selectedParts.map(part => (
                                        <div key={part.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{part.name_ar}</p>
                                                    <p className="text-xs text-slate-500">{part.price} ج.م</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                                                    <button
                                                        onClick={() => updatePartQuantity(part.id, part.used_quantity - 1)}
                                                        className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:text-blue-600"
                                                    >-</button>
                                                    <span className="font-bold w-4 text-center">{part.used_quantity}</span>
                                                    <button
                                                        onClick={() => updatePartQuantity(part.id, part.used_quantity + 1)}
                                                        className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm hover:text-blue-600"
                                                    >+</button>
                                                </div>
                                                <button
                                                    onClick={() => handleRemovePart(part.id)}
                                                    className="text-red-400 hover:text-red-600 p-2"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Total Cost */}
                            {selectedParts.length > 0 && (
                                <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
                                    <span className="font-bold">إجمالي تكلفة القطع</span>
                                    <span className="text-xl font-bold font-mono">{calculateTotalCost().toLocaleString()} ج.م</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <DynamicForm
                                categoryId={categoryId}
                                stage="closing"
                                onChange={setFormAnswers}
                            />

                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                <p className="text-sm text-blue-800 font-medium">
                                    بإغلاقك للبلاغ، أنت تؤكد إتمام جميع أعمال الإصلاح واختبار الجهاز. لا يمكن التراجع عن هذا الإجراء.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                    {step === 1 ? (
                        <>
                            <div className="flex-1"></div> {/* Spacer */}
                            <button
                                onClick={() => setStep(2)}
                                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
                            >
                                التالي: التوثيق
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep(1)}
                                disabled={submitting}
                                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-all flex items-center gap-2"
                            >
                                <ArrowRight className="w-5 h-5" />
                                السابق
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting}
                                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                إغلاق البلاغ نهائياً
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CloseTicketModal;
