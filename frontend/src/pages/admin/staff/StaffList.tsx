import { useState } from 'react';
import { Users, Download, Archive, ArchiveRestore } from 'lucide-react';
import { SovereignTable } from '../../../components/tickets/SovereignTable';
import { useSovereignQuery } from '../../../hooks/useSovereignQuery';
import { useSovereignMutation } from '../../../hooks/useSovereignMutation';
import { exportToExcel } from '../../../utils/exportUtils';
import StaffForm from './StaffForm';
import toast from 'react-hot-toast';

const StaffList: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<any>(null);
    const [showArchived, setShowArchived] = useState(false);

    const { data: staff, loading, refetch } = useSovereignQuery({
        table: 'profiles',
        select: `
            *,
            area:areas (name_ar),
            sector:sectors (name_ar)
        `,
        orderBy: { column: 'full_name', ascending: true },
        search: searchTerm,
        showArchived,
        searchColumns: ['full_name', 'specialization']
    });

    const { softDeleteRecord, restoreRecord } = useSovereignMutation({ table_name: 'profiles' });

    const handleAction = async (action: string, person: any) => {
        if (action === 'edit') {
            setEditingProfile(person);
            setIsFormOpen(true);
        } else if (action === 'delete') {
            if (window.confirm(`هل أنت متأكد من أرشفة الحساب: ${person.full_name}؟`)) {
                const { error } = await softDeleteRecord(person.id);
                if (!error) refetch();
            }
        } else if (action === 'restore') {
            const { error } = await restoreRecord(person.id);
            if (!error) refetch();
        }
    };

    const handleBatchAction = async (action: string, ids: string[]) => {
        if (action === 'archive') {
            if (window.confirm(`هل أنت متأكد من أرشفة ${ids.length} حساب؟`)) {
                const promises = ids.map(id => softDeleteRecord(id));
                await Promise.all(promises);
                toast.success('تمت الأرشفة الجماعية للكوادر');
                refetch();
            }
        }
    };

    const handleExport = () => {
        const dataToExport = staff.map(s => ({
            'الاسم': s.full_name,
            'التخصص': s.specialization || '-',
            'الرتبة': s.role,
            'الحالة': s.is_active ? 'نشط' : 'مؤرشف',
            'البريد الإلكتروني': s.email || '-',
            'الهاتف': s.phone || '-',
            'المنطقة': s.area?.name_ar || '-',
            'القطاع': s.sector?.name_ar || '-',
        }));
        exportToExcel(dataToExport, `Staff_List_Sovereign`);
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700 font-sans rtl" dir="rtl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 w-full">
                    <div className="flex items-center gap-8 flex-1">
                        <div className="bg-blue-600/20 p-5 rounded-[2rem] border border-blue-500/30 shadow-[0_0_50px_rgba(37,99,235,0.2)]">
                            <Users className="w-12 h-12 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black text-white tracking-tighter">إدارة الكوادر</h1>
                            <p className="text-white/40 text-xl font-medium mt-2">تنظيم القيادات والفنيين في غرف العمليات</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-3 px-6 py-4 rounded-2xl font-black bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all shadow-xl shadow-black/20"
                        >
                            <Download className="w-5 h-5 text-emerald-400" />
                            تصدير الكشوف
                        </button>

                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all border ${showArchived
                                ? 'bg-amber-500 text-white border-amber-600'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                                }`}
                        >
                            {showArchived ? <ArchiveRestore className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                            {showArchived ? 'الكوادر النشطة' : 'الأرشيف'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Table Section */}
                <div className="flex-1">
                    <SovereignTable
                        schemaKey="staff_management_v1"
                        data={staff.map(s => ({
                            ...s,
                            _actions: showArchived ? ['restore'] : undefined
                        }))}
                        loading={loading}
                        onAction={handleAction}
                        onBatchAction={handleBatchAction}
                        searchTerm={searchTerm}
                        onSearch={setSearchTerm}
                    />
                </div>

                {/* Side Panel Form */}
                {isFormOpen && (
                    <div className="w-full lg:w-[500px] bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl p-10 h-fit lg:sticky lg:top-10 animate-in slide-in-from-left duration-500">
                        <StaffForm
                            profile={editingProfile!}
                            onClose={() => setIsFormOpen(false)}
                            onSuccess={() => {
                                setIsFormOpen(false);
                                refetch();
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffList;
