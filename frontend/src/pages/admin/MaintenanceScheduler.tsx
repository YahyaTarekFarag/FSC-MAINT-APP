import { useState, useEffect } from 'react';
import { Calendar, Plus, Play, Clock, CheckCircle2, X, Loader2, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { EmptyState } from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

type Schedule = Database['public']['Tables']['maintenance_schedules']['Row'] & {
    branches: { name_ar: string } | null;
    maintenance_assets: { name: string } | null;
};

type Asset = Database['public']['Tables']['maintenance_assets']['Row'];

type Branch = {
    id: string;
    name_ar: string;
};

const MaintenanceScheduler = () => {
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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [schedulesRes, branchesRes] = await Promise.all([
                supabase.from('maintenance_schedules')
                    .select('*, branches(name_ar), maintenance_assets(name)')
                    .order('next_run', { ascending: true }),
                supabase.from('branches').select('id, name_ar').order('name_ar')
            ]);

            if (schedulesRes.error) throw schedulesRes.error;
            if (branchesRes.error) throw branchesRes.error;

            setSchedules((schedulesRes.data as unknown as Schedule[]) || []);
            setBranches(branchesRes.data || []);
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
                const { error } = await supabase.from('maintenance_schedules').insert({
                    title: formData.title,
                    description: formData.description,
                    frequency: formData.frequency as any,
                    priority: formData.priority as any,
                    is_active: formData.is_active,
                    branch_id: formData.branch_id,
                    asset_id: formData.asset_id || null,
                    start_date: formData.start_date,
                    next_run: formData.start_date
                } as Database['public']['Tables']['maintenance_schedules']['Insert']);
                if (error) throw error;
                toast.success('تمت إضافة الجدول بنجاح');
            } else {
                if (!selectedSchedule) return;
                const { error } = await supabase.from('maintenance_schedules')
                    .update({
                        title: formData.title,
                        description: formData.description,
                        frequency: formData.frequency as any,
                        priority: formData.priority as any,
                        is_active: formData.is_active,
                        branch_id: formData.branch_id,
                        asset_id: formData.asset_id || null
                    } as Database['public']['Tables']['maintenance_schedules']['Update'])
                    .eq('id', selectedSchedule.id);
                if (error) throw error;
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

    const openEditModal = (schedule: Schedule) => {
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
        setSelectedSchedule(null);
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

    const getPriorityColor = (p: string) => {
        const map: Record<string, string> = {
            low: 'bg-slate-100 text-slate-600',
            medium: 'bg-blue-50 text-blue-600',
            high: 'bg-amber-50 text-amber-600',
            urgent: 'bg-red-50 text-red-600'
        };
        return map[p] || 'bg-slate-100';
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-8 font-sans" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="w-8 h-8 text-blue-600" />
                        صيانة دورية (Preventive Maintenance)
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">جدولة المهام الدورية وإنشاء التذاكر تلقائياً</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleRunScheduler}
                        disabled={running}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50"
                    >
                        {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                        <span>تشغيل المجدول يدوياً</span>
                    </button>
                    <button
                        onClick={() => { resetForm(); setModalMode('add'); setShowModal(true); }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                    >
                        <Plus className="w-5 h-5" />
                        <span>إضافة جدول</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : schedules.length === 0 ? (
                <EmptyState
                    icon={Calendar}
                    title="لا توجد جداول صيانة"
                    description="قم بإضافة جداول للصيانة الدورية لإنشاء التذاكر تلقائياً."
                    actionLabel="إضافة جدول جديد"
                    onAction={() => setShowModal(true)}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {schedules.map(schedule => (
                        <div key={schedule.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 relative group hover:shadow-md transition-shadow">
                            <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <button onClick={() => openEditModal(schedule)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteId(schedule.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                <div className={`px-3 py-1 rounded-lg text-xs font-bold ${getPriorityColor(schedule.priority)}`}>
                                    {schedule.priority.toUpperCase()}
                                </div>
                                <div className={`flex items-center gap-1 text-xs font-bold ${schedule.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {schedule.is_active ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    {schedule.is_active ? 'نشط' : 'متوقف'}
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-2">{schedule.title}</h3>
                            <p className="text-slate-500 text-sm mb-4 line-clamp-2">{schedule.description || 'لا يوجد وصف'}</p>

                            <div className="space-y-3 pt-4 border-t border-slate-50">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">التكرار:</span>
                                    <span className="font-bold text-slate-700">{getFrequencyLabel(schedule.frequency)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">الموعد القادم:</span>
                                    <span className="font-bold text-blue-600 flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {new Date(schedule.next_run).toLocaleDateString('ar-EG')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">آخر تشغيل:</span>
                                    <span className="font-mono text-slate-600">
                                        {schedule.last_run ? new Date(schedule.last_run).toLocaleDateString('ar-EG') : '-'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">الفرع:</span>
                                    <span className="font-bold text-slate-700">{schedule.branches?.name_ar || 'غير محدد'}</span>
                                </div>
                                {schedule.maintenance_assets?.name && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-400">المعدة:</span>
                                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                                            {schedule.maintenance_assets.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">{modalMode === 'add' ? 'جدول صيانة جديد' : 'تعديل الجدول'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">العنوان</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                                    placeholder="مثال: صيانة التكييفات الشهرية"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">الوصف</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 h-20 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">التكرار</label>
                                    <select
                                        value={formData.frequency}
                                        onChange={e => setFormData({ ...formData, frequency: e.target.value as Schedule['frequency'] })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white"
                                    >
                                        <option value="daily">يومي</option>
                                        <option value="weekly">أسبوعي</option>
                                        <option value="monthly">شهري</option>
                                        <option value="quarterly">ربع سنوي</option>
                                        <option value="yearly">سنوي</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">الأولوية</label>
                                    <select
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: e.target.value as Schedule['priority'] })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white"
                                    >
                                        <option value="low">منخفضة</option>
                                        <option value="medium">متوسطة</option>
                                        <option value="high">عالية</option>
                                        <option value="urgent">عاجلة</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">تاريخ البدء</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">الفرع</label>
                                    <select
                                        required
                                        value={formData.branch_id}
                                        onChange={e => setFormData({ ...formData, branch_id: e.target.value, asset_id: '' })}
                                        className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white"
                                    >
                                        <option value="">اختر الفرع</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name_ar}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Asset Selection */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">المعدة المرتبطة (اختياري)</label>
                                <select
                                    value={formData.asset_id}
                                    onChange={e => setFormData({ ...formData, asset_id: e.target.value })}
                                    disabled={!formData.branch_id || fetchingAssets}
                                    className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                >
                                    <option value="">
                                        {fetchingAssets ? 'جاري التحميل...' : formData.branch_id ? 'اختر المعدة (اختياري)...' : 'يرجى اختيار الفرع أولاً'}
                                    </option>
                                    {assets.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                                {formData.branch_id && assets.length === 0 && !fetchingAssets && (
                                    <p className="text-[10px] text-amber-600 mt-1">لا توجد معدات نشطة مسجلة في هذا الفرع.</p>
                                )}
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="is_active" className="text-slate-700 font-bold select-none cursor-pointer">
                                    تفعيل الجدول
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                            >
                                {modalMode === 'add' ? 'إضافة' : 'حفظ التعديلات'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!deleteId}
                onCancel={() => setDeleteId(null)}
                onConfirm={handleDelete}
                title="حذف الجدول"
                message="هل أنت متأكد من حذف هذا الجدول؟ لن يتم إنشاء تذاكر جديدة منه."
                confirmLabel="حذف"
                cancelLabel="إلغاء"
                variant="danger"
            />
        </div>
    );
};

export default MaintenanceScheduler;
