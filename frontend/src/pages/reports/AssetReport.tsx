import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { exportToExcel } from '../../utils/exportToExcel';
import { Card } from '../../components/ui/Card';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#64748b'];

interface AssetStats {
    total: number;
    statusDistribution: { name: string; value: number }[];
}

const AssetReport = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<AssetStats | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [assetList, setAssetList] = useState<any[]>([]);

    useEffect(() => {
        fetchAssetData();
    }, []);

    const fetchAssetData = async () => {
        setLoading(true);
        try {
            // Fetch raw asset data
            const { data: assets, error } = await supabase
                .from('maintenance_assets') // Ensure this is the correct table name
                .select('*');

            if (error) throw error;

            // Process Stats
            const statusCounts: Record<string, number> = {};
            // let totalCost = 0; // This would ideally come from tickets linked to assets, simpler for now if we don't have joined cost readily available

            const processedAssets = assets.map((asset: any) => {
                const status = asset.status || 'Unknown';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
                return asset;
            });

            const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

            setStats({
                total: assets.length,
                statusDistribution: statusData
            });
            setAssetList(processedAssets);

        } catch (error) {
            console.error('Error fetching asset report:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const exportData = assetList.map(a => ({
            Name: a.name,
            SerialNumber: a.serial_number,
            Status: a.status,
            BranchID: a.branch_id,
            Model: a.model_number
        }));
        exportToExcel(exportData, `Asset_Report_${new Date().toISOString().split('T')[0]}`);
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">صحة الأصول</h2>
                <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                    <Download className="w-4 h-4" />
                    تصدير القائمة
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 flex flex-col justify-center items-center">
                    <h3 className="text-slate-500 font-bold mb-2">إجمالي الأصول</h3>
                    <p className="text-4xl font-black text-slate-900">{stats?.total || 0}</p>
                </Card>

                <Card className="p-6 col-span-2">
                    <h3 className="font-bold mb-4">توزيع حالة الأصول</h3>
                    <div className="h-64 flex items-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats?.statusDistribution || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats?.statusDistribution.map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2">
                            {stats?.statusDistribution.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                    <span>{item.name}: <b>{item.value}</b></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="p-4 border-b">
                    <h3 className="font-bold">قائمة الأصول</h3>
                </div>
                <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 sticky top-0 text-slate-500 font-bold text-sm">
                            <tr>
                                <th className="p-4">اسم الأصل</th>
                                <th className="p-4">الرقم التسلسلي</th>
                                <th className="p-4">الموديل</th>
                                <th className="p-4">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {assetList.map((asset) => (
                                <tr key={asset.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold">{asset.name}</td>
                                    <td className="p-4 font-mono text-xs">{asset.serial_number || '-'}</td>
                                    <td className="p-4">{asset.model_number || '-'}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${asset.status === 'Active' ? 'bg-green-100 text-green-700' :
                                            asset.status === 'Under Repair' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {asset.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default AssetReport;
