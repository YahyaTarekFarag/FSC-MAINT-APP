import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    LineChart,
    Line
} from 'recharts';
import { DollarSign, CheckCircle, TrendingUp, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export interface WidgetConfig {
    id: string;
    type: 'kpi_card' | 'bar_chart' | 'pie_chart' | 'line_chart';
    title: string;
    view?: string;
    column?: string;
    agg?: string;
    format?: 'currency' | 'number' | 'percent';
    xKey?: string;
    yKey?: string;
    groupKey?: string;
    countKey?: string;
    color?: string;
    icon?: string;
    link?: string;
}

interface SovereignChartProps {
    config: WidgetConfig;
    data: Record<string, any>[];
}

export const SovereignChart: React.FC<SovereignChartProps> = ({ config, data }) => {
    const navigate = useNavigate();

    const formattedValue = useMemo(() => {
        if (config.type !== 'kpi_card') return null;

        let val = 0;
        if (config.agg === 'sum') {
            val = data?.reduce((acc: number, curr: Record<string, any>) => acc + (Number(curr[config.column || '']) || 0), 0) || 0;
        } else {
            val = data?.[0]?.[config.column || ''] || 0;
        }

        if (config.format === 'currency') return `${Number(val).toLocaleString()} ج.م`;
        return Number(val).toLocaleString();
    }, [config, data]);

    const IconComponent = useMemo(() => {
        switch (config.icon) {
            case 'DollarSign': return DollarSign;
            case 'CheckCircle': return CheckCircle;
            case 'TrendingUp': return TrendingUp;
            default: return AlertTriangle;
        }
    }, [config.icon]);

    const handleClick = () => {
        if (config.link) {
            navigate(config.link);
        }
    };

    const containerClass = `relative overflow-hidden transition-all duration-300 ${config.link ? 'cursor-pointer hover:ring-2 hover:ring-blue-500/50' : ''}`;

    if (config.type === 'kpi_card') {
        return (
            <div
                onClick={handleClick}
                className={`bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-[2rem] shadow-2xl transition-all hover:scale-105 group ${containerClass}`}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:bg-blue-500/20 group-hover:border-blue-500/30 transition-all">
                        <IconComponent className="w-6 h-6 text-white/70 group-hover:text-blue-400" />
                    </div>
                    {config.link && <ArrowUpRight className="w-5 h-5 text-white/20 group-hover:text-white transition-all" />}
                </div>
                <h3 className="text-white/40 text-xs font-black uppercase tracking-widest mb-1">{config.title}</h3>
                <div className="text-3xl font-black text-white">{formattedValue}</div>
            </div>
        );
    }

    if (config.type === 'bar_chart') {
        return (
            <div
                onClick={handleClick}
                className={`bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] h-[400px] ${containerClass}`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-black text-lg flex items-center gap-3">
                        <span className="w-2 h-6 bg-blue-500 rounded-full" />
                        {config.title}
                    </h3>
                    {config.link && <ArrowUpRight className="w-5 h-5 text-white/20" />}
                </div>
                <div className="h-[300px] w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis
                                dataKey={config.xKey}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#ffffff40', fontWeight: 'bold' }}
                            />
                            <YAxis
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#ffffff40', fontWeight: 'bold' }}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                            <Bar
                                dataKey={config.yKey}
                                fill={config.color || '#3b82f6'}
                                radius={[10, 10, 0, 0]}
                                barSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    if (config.type === 'pie_chart') {
        const pieData = config.groupKey ?
            Object.entries(data.reduce((acc: Record<string, number>, curr: Record<string, any>) => {
                const key = String(curr[config.groupKey!]);
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {})).map(([name, value]) => ({ name, value }))
            : data.map(d => ({ name: d[config.xKey || 'name'], value: Number(d[config.yKey || 'value']) }));

        return (
            <div
                onClick={handleClick}
                className={`bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] h-[400px] ${containerClass}`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-black text-lg flex items-center gap-3">
                        <span className="w-2 h-6 bg-purple-500 rounded-full" />
                        {config.title}
                    </h3>
                    {config.link && <ArrowUpRight className="w-5 h-5 text-white/20" />}
                </div>
                <div className="h-[300px] w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={8}
                                dataKey="value"
                            >
                                {pieData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    if (config.type === 'line_chart') {
        return (
            <div
                onClick={handleClick}
                className={`bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] h-[400px] ${containerClass}`}
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-black text-lg flex items-center gap-3">
                        <span className="w-2 h-6 bg-emerald-500 rounded-full" />
                        {config.title}
                    </h3>
                    {config.link && <ArrowUpRight className="w-5 h-5 text-white/20" />}
                </div>
                <div className="h-[300px] w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis
                                dataKey={config.xKey}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#ffffff40', fontWeight: 'bold' }}
                            />
                            <YAxis
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#ffffff40', fontWeight: 'bold' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                                itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            />
                            <Line
                                type="monotone"
                                dataKey={config.yKey}
                                stroke={config.color || '#10b981'}
                                strokeWidth={4}
                                dot={{ fill: config.color || '#10b981', r: 6, strokeWidth: 2, stroke: '#000' }}
                                activeDot={{ r: 8, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    return null;
};
