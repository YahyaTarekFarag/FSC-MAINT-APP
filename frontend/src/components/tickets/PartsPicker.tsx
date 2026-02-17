import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Package, Plus, Trash2, AlertCircle } from 'lucide-react';

type SparePart = {
    id: string;
    name_ar: string;
    part_number: string;
    quantity: number;
    unit_types?: {
        name_ar: string;
    };
};

type SelectedPart = SparePart & {
    selected_quantity: number;
};

type PartsPickerProps = {
    onSelectionChange: (parts: { part_id: string; quantity: number }[]) => void;
};

const PartsPicker: React.FC<PartsPickerProps> = ({ onSelectionChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SparePart[]>([]);
    const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (searchTerm.length > 2) {
            handleSearch();
        } else {
            setSearchResults([]);
        }
    }, [searchTerm]);

    useEffect(() => {
        onSelectionChange(selectedParts.map(p => ({ part_id: p.id, quantity: p.selected_quantity })));
    }, [selectedParts]);

    const handleSearch = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('spare_parts')
            .select('*, unit_types(name_ar)')
            .ilike('name_ar', `%${searchTerm}%`)
            .limit(5);

        // Filter out already selected parts
        const filtered = (data as any || []).filter((p: SparePart) => !selectedParts.find(sp => sp.id === p.id));
        setSearchResults(filtered);
        setLoading(false);
    };

    const addPart = (part: SparePart) => {
        setSelectedParts([...selectedParts, { ...part, selected_quantity: 1 }]);
        setSearchTerm('');
    };

    const removePart = (id: string) => {
        setSelectedParts(selectedParts.filter(p => p.id !== id));
    };

    const updateQuantity = (id: string, qty: number, max: number) => {
        if (qty < 1) qty = 1;
        if (qty > max) qty = max;

        setSelectedParts(selectedParts.map(p =>
            p.id === id ? { ...p, selected_quantity: qty } : p
        ));
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute right-3 top-3 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="بحث عن قطع غيار لإضافتها (اكتب 3 حروف)..."
                    className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />

                {/* Search Dropdown */}
                {searchTerm.length > 2 && (
                    <div className="absolute w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 z-10 max-h-60 overflow-y-auto">
                        {loading ? (
                            <div className="p-4 text-center text-slate-400 text-sm">جاري البحث...</div>
                        ) : searchResults.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 text-sm">لا توجد نتائج</div>
                        ) : (
                            searchResults.map(part => (
                                <button
                                    key={part.id}
                                    onClick={() => addPart(part)}
                                    className="w-full text-right p-3 hover:bg-slate-50 flex items-center justify-between group"
                                >
                                    <div>
                                        <div className="font-bold text-slate-800">{part.name_ar}</div>
                                        <div className="text-xs text-slate-500 font-mono">{part.part_number}</div>
                                    </div>
                                    <div className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                                        متوفر: {part.quantity} {part.unit_types?.name_ar}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Selected Parts List */}
            {selectedParts.length > 0 && (
                <div className="space-y-2">
                    {selectedParts.map(part => (
                        <div key={part.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                            <div className="bg-white p-2 rounded-lg border border-slate-100">
                                <Package className="w-5 h-5 text-slate-500" />
                            </div>
                            <div className="flex-1">
                                <div className="font-bold text-slate-900 text-sm">{part.name_ar}</div>
                                <div className="text-xs text-slate-500">
                                    المتوفر: {part.quantity} {part.unit_types?.name_ar}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    className="w-16 p-1 text-center font-bold border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                                    value={part.selected_quantity}
                                    onChange={e => updateQuantity(part.id, Number(e.target.value), part.quantity)}
                                />
                                <span className="text-xs font-bold text-slate-500">{part.unit_types?.name_ar}</span>
                            </div>

                            <button onClick={() => removePart(part.id)} className="p-2 text-red-400 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PartsPicker;
