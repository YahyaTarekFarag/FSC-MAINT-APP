import { Outlet, useLocation, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { cn } from '../../lib/utils';
import { Users, Box, Wrench } from 'lucide-react';

const tabs = [
    { name: 'أداء الفنيين', path: '/reports/technicians', icon: Users },
    { name: 'صحة الأصول', path: '/reports/assets', icon: Box },
    { name: 'حركة المخزون', path: '/reports/inventory', icon: Wrench },
];

const ReportsLayout = () => {
    const location = useLocation();

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">التقارير والتحليلات</h1>
                <p className="text-slate-500 mt-1">متابعة أداء النظام والعمليات</p>
            </div>

            <Card className="p-2 flex gap-2 bg-slate-100/50 backdrop-blur-sm sticky top-0 z-10">
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.path;
                    return (
                        <Link
                            key={tab.path}
                            to={tab.path}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all flex-1 justify-center",
                                isActive
                                    ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5"
                                    : "text-slate-500 hover:bg-white/50 hover:text-slate-700"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                        </Link>
                    );
                })}
            </Card>

            <div className="min-h-[500px]">
                <Outlet />
            </div>
        </div>
    );
};

export default ReportsLayout;
