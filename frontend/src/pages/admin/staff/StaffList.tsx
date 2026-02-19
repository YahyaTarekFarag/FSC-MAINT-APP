import { Users } from 'lucide-react';
import { SovereignTable } from '../../../components/ui/SovereignTable';

const StaffList: React.FC = () => {
    return (
        <div className="space-y-10 animate-in fade-in duration-700 font-sans rtl" dir="rtl">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 border border-white/10 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none"></div>

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 w-full text-right">
                    <div className="flex items-center gap-8 flex-1">
                        <div className="bg-blue-600/20 p-5 rounded-[2rem] border border-blue-500/30 shadow-[0_0_50px_rgba(37,99,235,0.2)]">
                            <Users className="w-12 h-12 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-5xl font-black text-white tracking-tighter">إدارة الكوادر</h1>
                            <p className="text-white/40 text-xl font-medium mt-2">تنظيم القيادات والفنيين في غرف العمليات</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="relative">
                <SovereignTable
                    schemaKey="staff_management_v1"
                    tableName="profiles"
                />
            </div>
        </div>
    );
};

export default StaffList;
