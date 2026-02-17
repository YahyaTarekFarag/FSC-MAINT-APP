import { useState, useEffect } from 'react';
import { Search, Plus, Filter, Box, Settings } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import EmptyState from '../../../components/ui/EmptyState';
import AssetForm from './AssetForm';

type Asset = {
    id: string;
    name: string;
    branch_id: string;
    branches?: { name_ar: string };
    serial_number: string | null;
    model_number: string | null;
    status: 'active' | 'maintenance' | 'retired' | 'disposed';
    purchase_date: string | null;
    warranty_expiry: string | null;
};

const AssetList = () => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchAssets = async () => {
        try {
            let query = supabase.from('assets').select('*, branches(name_ar)').order('name');

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setAssets(data as any || []);
        } catch (error) {
            console.error('Error fetching assets:', error);
            toast.error('فشل تحميل الأصول');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, [statusFilter]);

    const filteredAssets = assets.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
        a.branches?.name_ar.includes(search)
    );

    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-emerald-100 text-emerald-700',
            maintenance: 'bg-amber-100 text-amber-700',
            retired: 'bg-slate-100 text-slate-600',
            disposed: 'bg-red-100 text-red-700'
        };
        const labels = {
            active: 'نشط',
            maintenance: 'صيانة',
            retired: 'متقاعد',
            disposed: 'تالف'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${(styles as any)[status] || styles.active}`}>
                {(labels as any)[status] || status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-8" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Box className="w-8 h-8 text-blue-600" />
                        إدارة الأصول (Assets)
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">تتبع الأصول، الضمانات، وسجل الصيانة</p>
                </div>
                <button
                    onClick={() => { setSelectedAsset(null); setShowForm(true); }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                    <Plus className="w-5 h-5" />
                    <span>إضافة أصل جديد</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث باسم الأصل، الرقم التسلسلي، أو الفرع..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="text-slate-400 w-5 h-5" />
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="p-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500 bg-white"
                    >
                        <option value="all">كل الحالات</option>
                        <option value="active">نشط</option>
                        <option value="maintenance">في الصيانة</option>
                        <option value="retired">متقاعد</option>
                        <option value="disposed">تالف</option>
                    </select>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="text-center py-12">تحميل...</div>
            ) : filteredAssets.length === 0 ? (
                <EmptyState
                    icon={Box}
                    title="لا توجد أصول"
                    description="لم يتم العثور على أصول تطابق البحث."
                    actionLabel="إضافة أصل"
                    onAction={() => setShowForm(true)}
                />
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-600 text-sm">
                            <tr>
                                <th className="p-4 font-bold">الأصل</th>
                                <th className="p-4 font-bold">الفرع</th>
                                <th className="p-4 font-bold hidden md:table-cell">الرقم التسلسلي</th>
                                <th className="p-4 font-bold">الحالة</th>
                                <th className="p-4 font-bold hidden md:table-cell">انتهاء الضمان</th>
                                <th className="p-4 font-bold">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredAssets.map(asset => (
                                <tr key={asset.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4 font-bold text-slate-900">{asset.name}</td>
                                    <td className="p-4 text-slate-600">{asset.branches?.name_ar || '-'}</td>
                                    <td className="p-4 text-slate-500 font-mono text-sm hidden md:table-cell">{asset.serial_number || '-'}</td>
                                    <td className="p-4">{getStatusBadge(asset.status)}</td>
                                    <td className="p-4 text-slate-500 text-sm hidden md:table-cell">
                                        {asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString('ar-EG') : '-'}
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => { setSelectedAsset(asset); setShowForm(true); }}
                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg"
                                        >
                                            <Settings className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <AssetForm
                    asset={selectedAsset}
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); fetchAssets(); }}
                />
            )}
        </div>
    );
};

export default AssetList;
