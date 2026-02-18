import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import { exportToExcel } from '../../utils/exportToExcel';
import { Card } from '../../components/ui/Card';

const InventoryReport = () => {
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [inventory, setInventory] = useState<any[]>([]);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('spare_parts')
                .select('*')
                .order('quantity', { ascending: true }); // Show low stock first

            if (error) throw error;
            setInventory(data || []);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        exportToExcel(inventory, `Inventory_Report_${new Date().toISOString().split('T')[0]}`);
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    const lowStockItems = inventory.filter(i => i.quantity <= (i.minimum_stock || 0));
    const totalValue = inventory.reduce((acc, item) => acc + (item.quantity * item.price), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">حركة المخزون</h2>
                <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                    <Download className="w-4 h-4" />
                    تصدير الجرد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-l-4 border-l-red-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 font-bold mb-1">تنبيهات انخفاض المخزون</p>
                            <h3 className="text-3xl font-black text-red-600">{lowStockItems.length}</h3>
                        </div>
                        <AlertTriangle className="text-red-500 w-8 h-8" />
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-blue-500">
                    <p className="text-slate-500 font-bold mb-1">إجمالي الأصناف</p>
                    <h3 className="text-3xl font-black text-slate-900">{inventory.length}</h3>
                </Card>

                <Card className="p-6 border-l-4 border-l-green-500">
                    <p className="text-slate-500 font-bold mb-1">قيمة المخزون المقدرة</p>
                    <h3 className="text-3xl font-black text-green-600">
                        {new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(totalValue)}
                    </h3>
                </Card>
            </div>

            <Card className="overflow-hidden">
                <div className="p-4 border-b">
                    <h3 className="font-bold">جرد قطع الغيار</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-sm">
                            <tr>
                                <th className="p-4">اسم القطعة</th>
                                <th className="p-4">الكمية الحالية</th>
                                <th className="p-4">الحد الأدنى</th>
                                <th className="p-4">السعر</th>
                                <th className="p-4">الموقع</th>
                                <th className="p-4">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {inventory.map((item) => {
                                const isLowStats = item.quantity <= item.minimum_stock;
                                return (
                                    <tr key={item.id} className={`hover:bg-slate-50 ${isLowStats ? 'bg-red-50/50' : ''}`}>
                                        <td className="p-4 font-bold">{item.name_ar}</td>
                                        <td className="p-4 text-lg">{item.quantity}</td>
                                        <td className="p-4 text-slate-500">{item.minimum_stock}</td>
                                        <td className="p-4">{item.price}</td>
                                        <td className="p-4 text-sm">{item.location || '-'}</td>
                                        <td className="p-4">
                                            {isLowStats && (
                                                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded w-fit">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    منخفض
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default InventoryReport;
