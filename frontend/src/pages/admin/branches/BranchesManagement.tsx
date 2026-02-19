import { useState } from 'react';
import { Building2, Archive, ArchiveRestore } from 'lucide-react';
import { SovereignTable } from '../../../components/tickets/SovereignTable';
import { SovereignActionModal } from '../../../components/ui/SovereignActionModal';
import { useSovereignMutation } from '../../../hooks/useSovereignMutation';
import { useSovereignQuery } from '../../../hooks/useSovereignQuery';
import toast from 'react-hot-toast';

const BranchesManagement: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [modalAction, setModalAction] = useState<'add' | 'edit'>('add');
    const [showArchived, setShowArchived] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: branches, loading, refetch } = useSovereignQuery({
        table: 'branches',
        showArchived,
        orderBy: { column: 'name_ar', ascending: true },
        search: searchTerm,
        searchColumns: ['name_ar', 'location'] // Search in name and location
    });

    const { createRecord, updateRecord, softDeleteRecord, restoreRecord } = useSovereignMutation({ table_name: 'branches' });

    const handleAction = async (action: string, item: any) => {
        if (action === 'add') {
            setSelectedItem(null);
            setModalAction('add');
            setIsModalOpen(true);
        } else if (action === 'edit') {
            setSelectedItem(item);
            setModalAction('edit');
            setIsModalOpen(true);
        } else if (action === 'delete') {
            if (window.confirm(`هل أنت متأكد من أرشفة الفرع: ${item.name_ar}؟`)) {
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

    return (
        <div className="space-y-10 animate-in fade-in duration-700 font-sans rtl" dir="rtl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none"></div>
                <div className="flex items-center gap-8 relative z-10 w-full">
                    <div className="bg-blue-600/20 p-5 rounded-[2rem] border border-blue-500/30 shadow-[0_0_50px_rgba(37,99,235,0.2)]">
                        <Building2 className="w-12 h-12 text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-5xl font-black text-white tracking-tighter">إدارة الفروع السيادية</h1>
                        <p className="text-white/40 text-xl font-medium mt-2">المحرك الموحد لإدارة أصول المؤسسة</p>
                    </div>

                    {/* Archive Toggle */}
                    <button
                        onClick={() => setShowArchived(!showArchived)}
                        className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all border ${showArchived
                            ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/20'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                            }`}
                    >
                        {showArchived ? <ArchiveRestore className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
                        {showArchived ? 'عرض الفروع النشطة' : 'عرض الأرشيف'}
                    </button>
                </div>
            </div>

            {/* Table Section */}
            <div className="relative">
                <SovereignTable
                    schemaKey="branches_management_v1"
                    data={branches.map(b => ({
                        ...b,
                        _actions: showArchived ? ['restore'] : undefined
                    }))}
                    loading={loading}
                    onAction={handleAction}
                    onSearch={setSearchTerm}
                    searchTerm={searchTerm}
                    onBatchAction={handleBatchAction}
                />
            </div>

            {/* Action Modal */}
            <SovereignActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                schemaKey="branches_management_v1"
                initialData={selectedItem}
                title={modalAction === 'add' ? 'إضافة فرع سيادي' : 'تعديل السجل السيادي'}
                onComplete={handleModalComplete}
            />
        </div>
    );
};


export default BranchesManagement;

