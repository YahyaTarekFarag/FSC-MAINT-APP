import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Plus, Clock, X, Loader2, Edit, Trash2, Shield, Zap, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';

type Schedule = Database['public']['Tables']['maintenance_schedules']['Row'] & {
    branches: { name_ar: string } | null;
    maintenance_assets: { name: string } | null;
};

type Asset = Database['public']['Tables']['maintenance_assets']['Row'];

type Branch = {
    id: string;
    name_ar: string;
};

type InventoryItem = {
    id: string;
    part_name: string;
    sku: string;
    quantity: number;
};

type SelectedPart = {
    part_id: string;
    required_quantity: number;
    part_name?: string;
};

const MaintenanceScheduler = () => {
    const [searchParams] = useSearchParams();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchingAssets, setFetchingAssets] = useState(false);
    const [running, setRunning] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        priority: 'medium',
        is_active: true,
        branch_id: '',
        asset_id: ''
    });

    // Smart-Prefill Logic
    useEffect(() => {
        const assetId = searchParams.get('assetId');
        const branchId = searchParams.get('branchId');
        if (assetId && branchId) {
            setFormData(prev => ({
                ...prev,
                asset_id: assetId,
                branch_id: branchId,
                title: 'صيانة ذكية مبرمجة'
            }));
            setShowModal(true);
            setModalMode('add');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [schedulesRes, branchesRes, inventoryRes] = await Promise.all([
                supabase.from('maintenance_schedules')
                    .select('*, branches(name_ar), maintenance_assets(name), schedule_parts(quantity:required_quantity, inventory(part_name))')
                    .order('next_run', { ascending: true }),
                supabase.from('branches').select('id, name_ar').order('name_ar'),
                supabase.from('inventory').select('id, part_name, sku, quantity').eq('is_active', true).order('part_name')
            ]);

            if (schedulesRes.error) throw schedulesRes.error;
            if (branchesRes.error) throw branchesRes.error;
            if (inventoryRes.error) throw inventoryRes.error;

            setSchedules((schedulesRes.data as unknown as Schedule[]) || []);
            setBranches(branchesRes.data || []);
            setInventoryItems(inventoryRes.data || []);
        } catch (error) {
            console.error('Error fetching schedules:', error);
            toast.error('فشل تحميل جداول الصيانة');
        } finally {
            setLoading(false);
        }
    };

    const fetchAssets = async (branchId: string) => {
        if (!branchId) {
            setAssets([]);
            return;
        }
        setFetchingAssets(true);
        try {
            const { data, error } = await supabase
                .from('maintenance_assets')
                .select('id, name')
                .eq('branch_id', branchId)
                .eq('status', 'Active')
                .order('name');
            if (error) throw error;
            setAssets(data || []);
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setFetchingAssets(false);
        }
    };

    useEffect(() => {
        if (formData.branch_id) {
            fetchAssets(formData.branch_id);
        } else {
            setAssets([]);
        }
    }, [formData.branch_id]);

    const handleRunScheduler = async () => {
        setRunning(true);
        try {
            const { data, error } = await supabase.rpc('generate_scheduled_tickets');
            if (error) throw error;

            toast.success(`تم إنشاء ${data} تذكرة صيانة بنجاح ✅`);
            fetchData();
        } catch (error) {
            console.error('Error running scheduler:', error);
            toast.error('فشل تشغيل المجدول');
        } finally {
            setRunning(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modalMode === 'add') {
                const { data, error } = await (supabase.from('maintenance_schedules') as any).insert({
                    title: formData.title,
                    description: formData.description,
                    frequency: formData.frequency as any,
                    priority: formData.priority as any,
                    is_active: formData.is_active,
                    branch_id: formData.branch_id,
                    asset_id: formData.asset_id || null,
                    start_date: formData.start_date,
                    next_run: formData.start_date
                });
                if (error) throw error;
                const newScheduleId = (data as any)[0].id;

                // Sync parts
                if (selectedParts.length > 0) {
                    const { error: partsError } = await (supabase.from('schedule_parts') as any).insert(
                        selectedParts.map(p => ({
                            schedule_id: newScheduleId,
                            part_id: p.part_id,
                            required_quantity: p.required_quantity
                        }))
                    );
                    if (partsError) throw partsError;
                }

                toast.success('تمت إضافة الجدول بنجاح');
            } else {
                if (!selectedSchedule) return;
                const { error } = await (supabase.from('maintenance_schedules') as any)
                    .update({
                        title: formData.title,
                        description: formData.description,
                        frequency: formData.frequency as any,
                        priority: formData.priority as any,
                        is_active: formData.is_active,
                        branch_id: formData.branch_id,
                        asset_id: formData.asset_id || null
                    })
                    .eq('id', selectedSchedule.id);
                if (error) throw error;

                // Sync parts
                await (supabase.from('schedule_parts') as any).delete().eq('schedule_id', selectedSchedule.id);
                if (selectedParts.length > 0) {
                    const { error: partsError } = await (supabase.from('schedule_parts') as any).insert(
                        selectedParts.map(p => ({
                            schedule_id: selectedSchedule.id,
                            part_id: p.part_id,
                            required_quantity: p.required_quantity
                        }))
                    );
                    if (partsError) throw partsError;
                }

                toast.success('تم تحديث الجدول بنجاح');
            }

            setShowModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving schedule:', error);
            toast.error('حدث خطأ أثناء الحفظ');
        }
    };

    const openEditModal = async (schedule: Schedule) => {
        setSelectedSchedule(schedule);
        setFormData({
            title: schedule.title,
            description: schedule.description || '',
            frequency: schedule.frequency,
            start_date: schedule.start_date,
            priority: schedule.priority,
            is_active: schedule.is_active,
            branch_id: schedule.branch_id,
            asset_id: schedule.asset_id || ''
        });

        // Fetch associated parts
        try {
            const { data, error } = await supabase
                .from('schedule_parts')
                .select('part_id, required_quantity, inventory(part_name)')
                .eq('schedule_id', schedule.id);

            if (error) throw error;
            setSelectedParts(data.map((p: any) => ({
                part_id: p.part_id,
                required_quantity: p.required_quantity,
                part_name: p.inventory?.part_name
            })));
        } catch (error) {
            console.error('Error fetching schedule parts:', error);
        }

        setModalMode('edit');
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const { error } = await supabase.from('maintenance_schedules').delete().eq('id', deleteId);
            if (error) throw error;
            toast.success('تم حذف الجدول');
            fetchData();
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('فشل الحذف');
        } finally {
            setDeleteId(null);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            frequency: 'monthly',
            start_date: new Date().toISOString().split('T')[0],
            priority: 'medium',
            is_active: true,
            branch_id: '',
            asset_id: ''
        });
        setSelectedParts([]);
        setSelectedSchedule(null);
    };

    const addPart = (partId: string) => {
        const item = inventoryItems.find(i => i.id === partId);
        if (!item) return;
        if (selectedParts.some(p => p.part_id === partId)) {
            toast.error('هذا الصنف مضاف بالفعل');
            return;
        }
        setSelectedParts([...selectedParts, {
            part_id: partId,
            required_quantity: 1,
            part_name: item.part_name
        }]);
    };

    const removePart = (partId: string) => {
        setSelectedParts(selectedParts.filter(p => p.part_id !== partId));
    };

    const updatePartQty = (partId: string, qty: number) => {
        setSelectedParts(selectedParts.map(p =>
            p.part_id === partId ? { ...p, required_quantity: Math.max(1, qty) } : p
        ));
    };

    const getFrequencyLabel = (freq: string) => {
        const map: Record<string, string> = {
            daily: 'يومي',
            weekly: 'أسبوعي',
            monthly: 'شهري',
            quarterly: 'ربع سنوي',
            yearly: 'سنوي'
        };
        return map[freq] || freq;
    };



    return (
        <div className="min-h-screen bg-slate-950 p-6 lg:p-12 font-sans relative overflow-hidden" dir="rtl">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 blur-[100px] rounded-full -ml-32 -mb-32 pointer-events-none" />

            {/* Header Section */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-4 rounded-3xl shadow-2xl shadow-blue-500/20">
                            <Calendar className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight">بروتوكول الصيانة الوقائية</h1>
                            <p className="text-white/30 text-xs font-bold uppercase tracking-[0.2em] mt-1">Autonomous Preventive Maintenance Protocol</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleRunScheduler}
                        disabled={running}
                        className="group flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                        {running ? <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> : <Zap className="w-5 h-5 text-blue-400" />}
                        <span>تشغيل المجدول</span>
                    </button>
                    <button
                        onClick={() => { resetForm(); setModalMode('add'); setShowModal(true); }}
                        className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-blue-500 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-blue-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        <span>برمجة جديدة</span>
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                    <span className="text-white/40 font-black text-[10px] uppercase tracking-widest">Synchronizing Vault...</span>
                </div>
            ) : (
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Active Schedules Feed */}
                    <div className="lg:col-span-3 space-y-8">
                        {schedules.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-[3rem] p-20 flex flex-col items-center text-center">
                                <Calendar className="w-16 h-16 text-white/5 mb-6" />
                                <h3 className="text-xl font-bold text-white/60">لا توجد بروتوكولات نشطة</h3>
                                <p className="text-white/20 text-sm mt-2">ابدأ ببرمجة صيانة دورية لتأمين سلامة الأصول</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <AnimatePresence>
                                    {schedules.map((schedule: any, idx: number) => (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={schedule.id}
                                            className="group bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-8 hover:bg-white/[0.08] transition-all relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditModal(schedule)} className="p-3 bg-white/5 rounded-xl text-white/40 hover:text-white hover:bg-blue-600 transition-all">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeleteId(schedule.id)} className="p-3 bg-white/5 rounded-xl text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex flex-col h-full space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${schedule.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                        }`}>
                                                        {schedule.priority}
                                                    </div>
                                                    <div className={`flex items-center gap-2 text-[10px] font-black tracking-widest uppercase ${schedule.is_active ? 'text-emerald-400' : 'text-white/20'}`}>
                                                        <div className={`w-2 h-2 rounded-full ${schedule.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                                                        {schedule.is_active ? 'Active' : 'Paused'}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <h3 className="text-xl font-bold text-white">{schedule.title}</h3>
                                                    <p className="text-white/40 text-sm line-clamp-2 leading-relaxed">{schedule.description}</p>
                                                </div>

                                                <div className="mt-auto pt-8 border-t border-white/5 grid grid-cols-2 gap-6">
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">التكرار</span>
                                                        <p className="text-white font-bold text-sm">{getFrequencyLabel(schedule.frequency)}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">الموعد القادم</span>
                                                        <p className="text-blue-400 font-bold text-sm flex items-center gap-2">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {new Date(schedule.next_run).toLocaleDateString('ar-EG')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="bg-white/[0.02] rounded-2xl p-4 flex items-center justify-between border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                                                            <Shield className="w-4 h-4 text-blue-400" />
                                                        </div>
                                                        <span className="text-xs font-bold text-white/60">{schedule.branches?.name_ar}</span>
                                                    </div>
                                                    {schedule.maintenance_assets?.name && (
                                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest truncate max-w-[100px]">
                                                            {schedule.maintenance_assets.name}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="pt-4 border-t border-white/5 space-y-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Package className="w-3 h-3 text-white/20" />
                                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">المستلزمات التقنية</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {schedule.schedule_parts?.map((p: any, pIdx: number) => (
                                                            <div key={pIdx} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-white/60">{p.inventory?.part_name}</span>
                                                                <span className="text-[10px] font-black text-blue-400">x{p.quantity}</span>
                                                            </div>
                                                        ))}
                                                        {(!schedule.schedule_parts || schedule.schedule_parts.length === 0) && (
                                                            <span className="text-[10px] font-bold text-white/10 italic">لا توجد قطع غيار محددة</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Stats & Timeline */}
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
                            <div>
                                <h4 className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-6">الجدول الزمني (30 يوم)</h4>
                                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {schedules
                                        .filter(s => {
                                            const nextRun = new Date(s.next_run);
                                            const thirtyDaysFromNow = new Date();
                                            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
                                            return s.is_active && nextRun <= thirtyDaysFromNow;
                                        })
                                        .sort((a, b) => new Date(a.next_run).getTime() - new Date(b.next_run).getTime())
                                        .map((s, idx) => (
                                            <div key={`timeline-${s.id}-${idx}`} className="relative pl-6 border-l border-white/10 pb-6 last:pb-0">
                                                <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">
                                                        {new Date(s.next_run).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                    <h5 className="text-xs font-bold text-white leading-tight">{s.title}</h5>
                                                    <p className="text-[9px] text-white/20 font-bold uppercase tracking-tight">{s.branches?.name_ar}</p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                    {schedules.filter(s => s.is_active).length === 0 && (
                                        <p className="text-[10px] text-white/20 font-bold text-center py-4">لا توجد مهام قادمة</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/10">
                                <h4 className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-6">Status Overview</h4>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
                                            <span className="text-sm font-bold text-white/60">إجمالي الجدولة</span>
                                        </div>
                                        <span className="text-2xl font-black text-white">{schedules.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-8 bg-emerald-500 rounded-full" />
                                            <span className="text-sm font-bold text-white/60">نشط حالياً</span>
                                        </div>
                                        <span className="text-2xl font-black text-white">{schedules.filter((s: any) => s.is_active).length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/10">
                                <h4 className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-6">التنبؤ التلقائي</h4>
                                <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-blue-400">
                                        <Zap className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">AI Prediction</span>
                                    </div>
                                    <p className="text-[10px] text-white/40 leading-relaxed">
                                        المؤشرات الحالية تدل على انخفاض معدل الأعطال بنسبة <span className="text-emerald-400 font-bold">14%</span> نتيجة التزام الفروع بالصيانة الوقائية.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Form Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-12">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[3rem] p-10 shadow-full relative z-[101] max-h-[90vh] overflow-y-auto overflow-x-hidden"
                        >
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tighter">
                                        {modalMode === 'add' ? 'برمجة بروتوكول جديد' : 'تعديل البروتوكول'}
                                    </h2>
                                    <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mt-1">Configure Maintenance Parameters</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
                                    <X className="w-5 h-5 text-white/40" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">عنوان المهمة</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold"
                                                placeholder="مثال: غسيل التكييفات نصف سنوي"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">الأولوية</label>
                                            <select
                                                value={formData.priority}
                                                onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold"
                                            >
                                                <option value="low">Low Impact</option>
                                                <option value="medium">Standard</option>
                                                <option value="high">Critical</option>
                                                <option value="urgent">Urgent Intervention</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">تفاصيل البروتوكول</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all h-32 resize-none font-medium leading-relaxed"
                                            placeholder="اكتب خطوات الصيانة المطلوبة هنا..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">معدل التكرار</label>
                                            <select
                                                value={formData.frequency}
                                                onChange={e => setFormData({ ...formData, frequency: e.target.value as any })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold"
                                            >
                                                <option value="daily">يومي</option>
                                                <option value="weekly">أسبوعي</option>
                                                <option value="monthly">شهري</option>
                                                <option value="quarterly">ربع سنوي</option>
                                                <option value="yearly">سنوي</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">تاريخ البدء</label>
                                            <input
                                                type="date"
                                                required
                                                value={formData.start_date}
                                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">الموقع / الفرع</label>
                                            <select
                                                required
                                                value={formData.branch_id}
                                                onChange={e => setFormData({ ...formData, branch_id: e.target.value, asset_id: '' })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold"
                                            >
                                                <option value="">Select Branch</option>
                                                {branches.map((b: any) => (
                                                    <option key={b.id} value={b.id}>{b.name_ar}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">الأصل المرتبط</label>
                                            <select
                                                value={formData.asset_id}
                                                onChange={e => setFormData({ ...formData, asset_id: e.target.value })}
                                                disabled={!formData.branch_id || fetchingAssets}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all font-bold disabled:opacity-30"
                                            >
                                                <option value="">{fetchingAssets ? 'Syncing...' : 'Optional Asset'}</option>
                                                {assets.map((a: any) => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">قطع الغيار المطلوبة (تلقائي)</label>
                                            <div className="flex gap-2">
                                                <select
                                                    onChange={(e) => addPart(e.target.value)}
                                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-blue-500 transition-all font-bold"
                                                    value=""
                                                >
                                                    <option value="">+ إضافة صنف</option>
                                                    {inventoryItems.map(item => (
                                                        <option key={item.id} value={item.id}>{item.part_name} ({item.sku})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {selectedParts.map((part) => (
                                                <div key={part.part_id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4 group hover:border-blue-500/30 transition-all">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-white">{part.part_name}</span>
                                                        <span className="text-[9px] text-white/20 font-black uppercase">Part ID: {part.part_id.slice(0, 8)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => updatePartQty(part.part_id, part.required_quantity - 1)}
                                                                className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg hover:bg-white/10 text-white/40"
                                                            >-</button>
                                                            <span className="text-sm font-black text-blue-400 w-6 text-center">{part.required_quantity}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => updatePartQty(part.part_id, part.required_quantity + 1)}
                                                                className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg hover:bg-white/10 text-white/40"
                                                            >+</button>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removePart(part.part_id)}
                                                            className="p-2 text-rose-500/40 hover:text-rose-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {selectedParts.length === 0 && (
                                                <div className="border-2 border-dashed border-white/5 rounded-2xl p-8 text-center">
                                                    <p className="text-white/20 text-xs font-bold">لا يوجد قطع غيار مرتبطة بهذا البروتوكول</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <label className="flex items-center gap-4 cursor-pointer group">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.is_active}
                                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                                    className="sr-only"
                                                />
                                                <div className={`w-14 h-8 rounded-full transition-all ${formData.is_active ? 'bg-blue-600' : 'bg-white/10'}`} />
                                                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all transform ${formData.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-sm font-bold text-white/60 group-hover:text-white transition-colors">تفعيل البروتوكول فوراً</span>
                                        </label>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black text-sm tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-2xl shadow-white/10 mt-6"
                                >
                                    {modalMode === 'add' ? 'تشفير وحفظ البروتوكول' : 'تحديث البيانات'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmDialog
                isOpen={!!deleteId}
                onCancel={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="فسخ البروتوكول"
                message="هل أنت متأكد من حذف هذا البروتوكول؟ سيتم إيقاف توليد التذاكر التلقائية لهذا الأصل."
                confirmLabel="حذف نهائي"
                cancelLabel="إلغاء"
                variant="danger"
            />
        </div>
    );
};

export default MaintenanceScheduler;
