import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase'; // Adjust path
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import { exportToExcel } from '../../utils/exportToExcel';
import { Card } from '../../components/ui/Card';

// Helper for currency if not imported
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
};

interface TechnicianStats {
    name: string;
    totalTickets: number;
    completedTickets: number;
    totalCost: number;
    openTickets: number;
}

const TechnicianReport = () => {
    const [loading, setLoading] = useState(true);
    const [technicians, setTechnicians] = useState<TechnicianStats[]>([]);
    const [dateRange, setDateRange] = useState('month');

    const fetchTechnicianData = async () => {
        setLoading(true);
        try {
            // This is a simplified fetch. In production, we might need more complex joins or RPC.
            // For now, let's fetch profiles and their ticket stats
            // We might need to fetch tickets and aggregate manually if no RPC exists

            let query = supabase
                .from('tickets')
                .select('technician_id, repair_cost, status, created_at, profiles:technician_id(full_name)');

            if (dateRange !== 'all') {
                const now = new Date();
                const startDate = new Date();
                if (dateRange === 'week') startDate.setDate(now.getDate() - 7);
                if (dateRange === 'month') startDate.setMonth(now.getMonth() - 1);
                if (dateRange === 'year') startDate.setFullYear(now.getFullYear() - 1);
                query = query.gte('created_at', startDate.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;

            // Aggregation
            const techMap: Record<string, TechnicianStats> = {};

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.forEach((ticket: any) => {
                const techName = ticket.profiles?.full_name || 'Unassigned';
                if (!techMap[techName]) {
                    techMap[techName] = {
                        name: techName,
                        totalTickets: 0,
                        completedTickets: 0,
                        totalCost: 0,
                        openTickets: 0
                    };
                }

                techMap[techName].totalTickets++;
                techMap[techName].totalCost += ticket.repair_cost || 0;

                if (ticket.status === 'closed' || ticket.status === 'resolved') {
                    techMap[techName].completedTickets++;
                } else {
                    techMap[techName].openTickets++;
                }
            });

            const processedData = Object.values(techMap);
            setTechnicians(processedData);

        } catch (error) {
            console.error('Error fetching technician report:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTechnicianData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange]);

    const handleExport = () => {
        exportToExcel(technicians, `Technician_Performance_${new Date().toISOString().split('T')[0]}`);
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">أداء الفنيين</h2>
                <div className="flex gap-2">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="p-2 border rounded-lg bg-white"
                    >
                        <option value="week">آخر أسبوع</option>
                        <option value="month">آخر شهر</option>
                        <option value="year">آخر سنة</option>
                        <option value="all">الكل</option>
                    </select>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                        <Download className="w-4 h-4" />
                        تصدير
                    </button>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h3 className="font-bold mb-4">البلاغات المنجزة حسب الفني</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={technicians}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="completedTickets" fill="#3b82f6" name="منجزة" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="font-bold mb-4">التكلفة حسب الفني</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={technicians}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                <Tooltip cursor={{ fill: 'transparent' }} formatter={(value: any) => [formatCurrency(value), 'التكلفة']} />
                                <Bar dataKey="totalCost" fill="#10b981" name="التكلفة" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Table */}
            <Card className="overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-sm">
                        <tr>
                            <th className="p-4">اسم الفني</th>
                            <th className="p-4">إجمالي البلاغات</th>
                            <th className="p-4">المنجزة</th>
                            <th className="p-4">قيد العمل</th>
                            <th className="p-4">إجمالي التكلفة</th>
                            <th className="p-4">معدل الإنجاز</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {technicians.map((tech, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-4 font-medium">{tech.name}</td>
                                <td className="p-4">{tech.totalTickets}</td>
                                <td className="p-4 text-green-600 font-bold">{tech.completedTickets}</td>
                                <td className="p-4 text-orange-500">{tech.openTickets}</td>
                                <td className="p-4">{formatCurrency(tech.totalCost)}</td>
                                <td className="p-4">
                                    {tech.totalTickets > 0
                                        ? Math.round((tech.completedTickets / tech.totalTickets) * 100) + '%'
                                        : '0%'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default TechnicianReport;
