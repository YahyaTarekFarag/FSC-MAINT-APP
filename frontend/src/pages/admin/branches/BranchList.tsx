import { useEffect, useState, useCallback } from 'react';
import {
    Building2,
    Plus,
    Search,
    Edit2,
    Trash2,
    ExternalLink,
    MapPin,
    Loader2,
    Database as DatabaseIcon
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/supabase';
import BranchForm from './BranchForm';
import toast from 'react-hot-toast';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';

type BranchWithRelations = Database['public']['Tables']['branches']['Row'] & {
    brand: Database['public']['Tables']['brands']['Row'];
    area: Database['public']['Tables']['areas']['Row'] & {
        sector: Database['public']['Tables']['sectors']['Row'];
    };
};

const BranchList: React.FC = () => {
    const [branches, setBranches] = useState<BranchWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal/Side-panel State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Database['public']['Tables']['branches']['Row'] | null>(null);

    // Delete State
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchBranches = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('branches')
                .select(`
          *,
          brand:brands(*),
          area:areas(*, sector:sectors(*))
        `)
                .order('name_ar');

            if (error) throw error;
            setBranches((data as unknown) as BranchWithRelations[]);
        } catch (err) {
            console.error('Error fetching branches:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    const confirmDelete = (id: string, name: string) => {
        setDeleteTarget({ id, name });
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);

        try {
            const { error } = await supabase
                .from('branches')
                .delete()
                .eq('id', deleteTarget.id);

            if (error) throw error;
            toast.success('تم حذف الفرع بنجاح');
            fetchBranches();
        } catch (err: any) {
            console.error('Error deleting branch:', err);
            toast.error('خطأ في حذف الفرع: ' + err.message);
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    const filteredBranches = branches.filter(b =>
        b.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.brand.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.area.name_ar.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">إدارة الفروع</h1>
                    <p className="text-slate-500 mt-1">إضافة وتعديل بيانات فروع العلامات التجارية</p>
                </div>
                <button
                    onClick={() => {
                        setEditingBranch(null);
                        setIsFormOpen(true);
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                    <Plus className="w-5 h-5" />
                    إضافة فرع جديد
                </button>
            </div>

            {/* Main Container */}
            <div className="flex flex-col lg:flex-row gap-8">

                {/* Branch Table Section */}
                <div className={`flex-1 space-y-4 transition-all duration-500 ${isFormOpen ? 'hidden lg:block lg:opacity-50 pointer-events-none' : ''}`}>
                    {/* Search & Stats */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                        <div className="flex-1 relative w-full">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="بحث عن فرع، براند، أو منطقة..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold shrink-0">
                            إجمالي الفروع: {filteredBranches.length}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="p-6 text-sm font-black text-slate-400 uppercase tracking-widest">الفرع / البراند</th>
                                        <th className="p-6 text-sm font-black text-slate-400 uppercase tracking-widest">المنطقة / القطاع</th>
                                        <th className="p-6 text-sm font-black text-slate-400 uppercase tracking-widest">خرائط جوجل</th>
                                        <th className="p-6 text-sm font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                                        <th className="p-6 text-sm font-black text-slate-400 uppercase tracking-widest">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center">
                                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold">جاري تحميل البيانات...</p>
                                            </td>
                                        </tr>
                                    ) : filteredBranches.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-12">
                                                <EmptyState
                                                    icon={Building2}
                                                    title="لا توجد فروع"
                                                    description="لم يتم العثور على فروع تطابق بحثك. قم بإضافة فرع جديد للبدء."
                                                    actionLabel="إضافة فرع جديد"
                                                    onAction={() => {
                                                        setEditingBranch(null);
                                                        setIsFormOpen(true);
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBranches.map((branch) => (
                                            <tr key={branch.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-400 overflow-hidden shrink-0 border border-slate-200">
                                                            {branch.brand.logo_url ? (
                                                                <img src={branch.brand.logo_url} alt={branch.brand.name_ar} className="w-full h-full object-cover" />
                                                            ) : branch.brand.name_ar.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">{branch.name_ar}</p>
                                                            <p className="text-xs text-slate-400 font-bold">{branch.brand.name_ar}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div>
                                                        <p className="font-bold text-slate-700 text-sm">{branch.area.name_ar}</p>
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{branch.area.sector.name_ar}</p>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    {branch.google_map_link ? (
                                                        <a
                                                            href={branch.google_map_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 text-blue-600 hover:underline font-bold text-xs"
                                                        >
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            عرض الموقع
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs font-bold italic">لا يوجد رابط</span>
                                                    )}
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                        <span className="text-xs font-bold text-slate-600">نشط</span>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-2 justify-end lg:justify-start">
                                                        <a
                                                            href={`/admin/assets?branch_id=${branch.id}`}
                                                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                                                            title="أصول الفرع"
                                                        >
                                                            <DatabaseIcon className="w-4 h-4" />
                                                        </a>
                                                        <button
                                                            onClick={() => {
                                                                setEditingBranch(branch);
                                                                setIsFormOpen(true);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => confirmDelete(branch.id, branch.name_ar)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
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
                </div>

                {/* Side Panel Form */}
                {isFormOpen && (
                    <div className="w-full lg:w-[450px] bg-white rounded-3xl border border-blue-100 shadow-2xl shadow-blue-500/10 p-8 h-fit lg:sticky lg:top-24">
                        <BranchForm
                            branch={editingBranch}
                            onClose={() => setIsFormOpen(false)}
                            onSuccess={() => {
                                setIsFormOpen(false);
                                fetchBranches();
                            }}
                        />
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title={`حذف فرع ${deleteTarget?.name}`}
                message="هل أنت متأكد من أنك تريد حذف هذا الفرع؟ قد يؤدي هذا إلى فقدان البيانات المرتبطة به."
                confirmLabel="حذف الفرع"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};

export default BranchList;
