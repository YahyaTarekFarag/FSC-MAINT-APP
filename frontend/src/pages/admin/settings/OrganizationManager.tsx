import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Building, Map, Layers, CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface Brand {
    id: string;
    name_ar: string;
    logo_url?: string;
}

interface Sector {
    id: string;
    name_ar: string;
}

interface Area {
    id: string;
    name_ar: string;
    sector_id: string;
}

export default function OrganizationManager() {
    const [activeTab, setActiveTab] = useState<'brands' | 'structure'>('brands');
    const [loading, setLoading] = useState(true);

    // Data State
    const [brands, setBrands] = useState<Brand[]>([]);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'brand' | 'sector' | 'area' | null>(null);
    const [editingItem, setEditingItem] = useState<Brand | Sector | Area | null>(null);
    const [formData, setFormData] = useState<Partial<Brand & Sector & Area>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [b, s, a] = await Promise.all([
                supabase.from('brands').select('*').order('name_ar'),
                supabase.from('sectors').select('*').order('name_ar'),
                supabase.from('areas').select('*').order('name_ar')
            ]);

            setBrands(b.data || []);
            setSectors(s.data || []);
            setAreas(a.data || []);
        } catch (error) {
            console.error(error);
            toast.error('فشل تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (type: 'brand' | 'sector' | 'area', item: Brand | Sector | Area | null = null) => {
        setModalType(type);
        setEditingItem(item);
        if (item) {
            setFormData({ ...item });
        } else {
            setFormData(type === 'area' ? { name_ar: '', sector_id: sectors[0]?.id || '' } : { name_ar: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name_ar) return toast.error('الاسم مطلوب');

        try {
            let error;

            if (modalType === 'brand') {
                const payload = {
                    name_ar: formData.name_ar!,
                    logo_url: formData.logo_url || null
                };
                if (editingItem) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { error: err } = await (supabase.from('brands') as any).update(payload).eq('id', editingItem.id);
                    error = err;
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { error: err } = await (supabase.from('brands') as any).insert(payload);
                    error = err;
                }
            } else if (modalType === 'sector') {
                const payload = { name_ar: formData.name_ar };
                if (editingItem) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { error: err } = await (supabase.from('sectors') as any).update(payload).eq('id', editingItem.id);
                    error = err;
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { error: err } = await (supabase.from('sectors') as any).insert(payload);
                    error = err;
                }
            } else if (modalType === 'area') {
                const payload = { name_ar: formData.name_ar, sector_id: formData.sector_id };
                if (editingItem) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { error: err } = await (supabase.from('areas') as any).update(payload).eq('id', editingItem.id);
                    error = err;
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { error: err } = await (supabase.from('areas') as any).insert(payload);
                    error = err;
                }
            }

            if (error) throw error;
            toast.success('تم الحفظ بنجاح');
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const err = error as any;
            toast.error('خطأ: ' + (err?.message || 'Unknown error'));
        }
    };

    // --- Sub-components (Render Helpers) ---

    // 1. Brands Tab
    const renderBrands = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800">العلامات التجارية (Brands)</h3>
                <button
                    onClick={() => openModal('brand')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    إضافة براند
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {brands.map(brand => (
                    <div key={brand.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-bold border border-slate-100">
                                {brand.logo_url ? <img src={brand.logo_url} className="w-8 h-8 object-contain" /> : <Building className="w-6 h-6" />}
                            </div>
                            <span className="font-bold text-slate-800">{brand.name_ar}</span>
                        </div>
                        <button
                            onClick={() => openModal('brand', brand)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    // 2. Structure Tab
    const renderStructure = () => (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800">الهيكل الجغرافي (قطاعات ومناطق)</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => openModal('sector')}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-purple-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        إضافة قطاع
                    </button>
                    <button
                        onClick={() => openModal('area')}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        إضافة منطقة
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {sectors.map(sector => (
                    <div key={sector.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-purple-600" />
                                <h4 className="font-black text-lg text-slate-800">{sector.name_ar}</h4>
                                <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold">قطاع رئيسي</span>
                            </div>
                            <button
                                onClick={() => openModal('sector', sector)}
                                className="p-2 text-slate-400 hover:text-purple-600 rounded-lg transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {areas.filter(a => a.sector_id === sector.id).map(area => (
                                <div key={area.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 group transition-all">
                                    <div className="flex items-center gap-2">
                                        <Map className="w-4 h-4 text-emerald-500" />
                                        <span className="font-bold text-slate-700 text-sm">{area.name_ar}</span>
                                    </div>
                                    <button
                                        onClick={() => openModal('area', area)}
                                        className="p-1.5 text-slate-300 hover:text-emerald-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {areas.filter(a => a.sector_id === sector.id).length === 0 && (
                                <div className="col-span-full text-center py-4 text-slate-400 text-xs font-bold border border-dashed border-slate-200 rounded-xl">
                                    لا توجد مناطق مضافة لهذا القطاع
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen font-sans" dir="rtl">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-black text-slate-900 mb-6">مدير الهيكل التنظيمي</h1>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-slate-200 pb-1">
                    <button
                        onClick={() => setActiveTab('brands')}
                        className={`pb-3 px-4 font-bold text-sm transition-all relative ${activeTab === 'brands' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        العلامات التجارية
                        {activeTab === 'brands' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('structure')}
                        className={`pb-3 px-4 font-bold text-sm transition-all relative ${activeTab === 'structure' ? 'text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        المناطق والقطاعات
                        {activeTab === 'structure' && <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-600 rounded-t-full" />}
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-10 text-slate-400 font-bold">جاري تحميل الهيكل...</div>
                ) : (
                    activeTab === 'brands' ? renderBrands() : renderStructure()
                )}

                {/* Unified Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-800">
                                    {editingItem ? 'تعديل' : 'إضافة'} {modalType === 'brand' ? 'علامة تجارية' : modalType === 'sector' ? 'قطاع' : 'منطقة'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 mb-2">الاسم (بالعربية)</label>
                                    <input
                                        type="text"
                                        value={formData.name_ar || ''}
                                        onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="الاسم..."
                                    />
                                </div>

                                {modalType === 'brand' && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2">رابط الشعار (اختياري)</label>
                                        <input
                                            type="text"
                                            value={formData.logo_url || ''}
                                            onChange={e => setFormData({ ...formData, logo_url: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                                            placeholder="https://example.com/logo.png"
                                        />
                                    </div>
                                )}

                                {modalType === 'area' && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-600 mb-2">القطاع التابع له</label>
                                        <div className="relative">
                                            <select
                                                value={formData.sector_id || ''}
                                                onChange={e => setFormData({ ...formData, sector_id: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                                            >
                                                <option value="" disabled>اختر القطاع...</option>
                                                {sectors.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name_ar}</option>
                                                ))}
                                            </select>
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▼</div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleSave}
                                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-2 mt-4"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    حفظ
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
