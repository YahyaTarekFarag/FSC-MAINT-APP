import { useState, useCallback } from 'react';
import {
    Settings,
    Clock,
    Database as DbIcon,
    ChevronRight,
    Loader2,
    Calendar,
    Filter,
    FileText,
    Users,
    UserCog,
    Store,
    Shield,
    Box,
    Coins,
    ShieldCheck,
    BarChart3,
    Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

// ... (imports remain same)

type AttendanceLog = {
    id: number;
    user_id: string;
    action_type: 'check_in' | 'check_out';
    timestamp: string;
    location_lat: number | null;
    location_lng: number | null;
    profiles: {
        full_name: string;
        role: string;
    };
};

interface MasterCardProps {
    title: string;
    desc: string;
    icon: React.ElementType;
    color: string;
    onClick?: () => void;
}

const AdminConsole: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'master' | 'attendance'>('master');
    const [attendance, setAttendance] = useState<AttendanceLog[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        try {
            // Joining attendance_logs with profiles
            const { data, error } = await supabase
                .from('attendance_logs')
                .select(`
          *,
          profiles:user_id(full_name, role)
        `)
                .order('timestamp', { ascending: false });

            if (error) throw error;

            // Transform data to match AttendanceLog type if necessary, or let it infer
            // The inferred type from supabase join is usually correct but might be nested array
            // casting to unknown then to expected type is safer than 'any'
            setAttendance(data as unknown as AttendanceLog[]);
        } catch (err) {
            console.error('Error fetching attendance:', err);
        } finally {
            setLoading(false);
        }
    }, []);
    // ... (rest of logic)

    const tabs = [
        { id: 'master', label: 'البيانات الأساسية', icon: DbIcon },
        { id: 'attendance', label: 'سجل الحضور', icon: Clock }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900">وحدة التحكم الإدارية</h1>
                <p className="text-slate-500 mt-1">إعدادات النظام وإدارة القوى العاملة</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'master' | 'attendance')}
                        className={`
              flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all
              ${activeTab === tab.id
                                ? 'bg-slate-900 text-white shadow-lg'
                                : 'text-slate-500 hover:bg-slate-50'}
            `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm min-h-[500px] overflow-hidden">
                {activeTab === 'master' ? (
                    <div className="p-8 space-y-12">
                        {/* Section: Intelligence & Strategy */}
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-600/10 rounded-lg">
                                    <Zap className="w-4 h-4 text-blue-600" />
                                </div>
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">التحليلات والذكاء الاصطناعي</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <MasterCard
                                    title="الذكاء السيادي"
                                    desc="تحليلات استباقية، تنبؤ بالأعطال، وإدارة المخزون الذكي"
                                    icon={Zap}
                                    color="bg-blue-600 text-white shadow-lg shadow-blue-200"
                                    onClick={() => navigate('/admin/intelligence')}
                                />
                                <MasterCard
                                    title="لوحة التحليلات"
                                    desc="نظرة استراتيجية شاملة على أداء النظام التشغيلي"
                                    icon={BarChart3}
                                    color="bg-slate-900 text-white"
                                    onClick={() => navigate('/admin/dashboard')}
                                />
                            </div>
                        </div>

                        {/* Section: Operations & Workflow */}
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-emerald-600/10 rounded-lg">
                                    <Settings className="w-4 h-4 text-emerald-600" />
                                </div>
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">العمليات والتشغيل</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <MasterCard
                                    title="الصيانة الوقائية"
                                    desc="جدولة المهام الدورية والزيارات المخططة"
                                    icon={Calendar}
                                    color="bg-emerald-50 text-emerald-600"
                                    onClick={() => navigate('/admin/maintenance/schedules')}
                                />
                                <MasterCard
                                    title="إدارة الأصول"
                                    desc="تتبع المعدات، الضمان، وفترات العمر الافتراضي"
                                    icon={Box}
                                    color="bg-indigo-50 text-indigo-600"
                                    onClick={() => navigate('/admin/assets')}
                                />
                                <MasterCard
                                    title="المخزن والقطع"
                                    desc="إدارة قطع الغيار والعهدة المخزنية"
                                    icon={Store}
                                    color="bg-amber-50 text-amber-600"
                                    onClick={() => navigate('/admin/inventory')}
                                />
                                <MasterCard
                                    title="نماذج الإغلاق"
                                    desc="تصميم نماذج التشخيص وتقارير الفنيين"
                                    icon={FileText}
                                    color="bg-blue-50 text-blue-600"
                                    onClick={() => navigate('/admin/settings/forms')}
                                />
                            </div>
                        </div>

                        {/* Section: Workforce & Finance */}
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-purple-600/10 rounded-lg">
                                    <Users className="w-4 h-4 text-purple-600" />
                                </div>
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">القوى العاملة والمالية</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <MasterCard
                                    title="الأداء والرواتب"
                                    desc="متابعة الحوافز، المكافآت، وتكلفة العمالة"
                                    icon={Coins}
                                    color="bg-purple-50 text-purple-600"
                                    onClick={() => navigate('/admin/payroll')}
                                />
                                <MasterCard
                                    title="إدارة المستخدمين"
                                    desc="إضافة الموظفين وتعديل الصلاحيات"
                                    icon={UserCog}
                                    color="bg-slate-50 text-slate-600"
                                    onClick={() => navigate('/admin/users')}
                                />
                                <MasterCard
                                    title="الهيكل التنظيمي"
                                    desc="إدارة القطاعات، الفروع، والمناطق"
                                    icon={Store}
                                    color="bg-teal-50 text-teal-600"
                                    onClick={() => navigate('/admin/structure')}
                                />
                                <MasterCard
                                    title="المركز المالي"
                                    desc="نظرة عامة على الإنفاق والميزانية"
                                    icon={BarChart3}
                                    color="bg-rose-50 text-rose-600"
                                    onClick={() => navigate('/admin/finance')}
                                />
                            </div>
                        </div>

                        {/* Section: Security & System */}
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-slate-600/10 rounded-lg">
                                    <Shield className="w-4 h-4 text-slate-600" />
                                </div>
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">الأمن والنظام</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <MasterCard
                                    title="الصندوق الأسود"
                                    desc="سجلات الرقابة السيادية لعمليات النظام"
                                    icon={ShieldCheck}
                                    color="bg-slate-900 text-white"
                                    onClick={() => navigate('/admin/audit-logs')}
                                />
                                <MasterCard
                                    title="إعدادات النظام"
                                    desc="تحكم كامل في خيارات التطبيق الأساسية"
                                    icon={Shield}
                                    color="bg-slate-50 text-slate-400"
                                    onClick={() => navigate('/admin/settings/system')}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-0">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-slate-900">سجل النشاط اليومي</h3>
                            </div>
                            <button
                                onClick={fetchAttendance}
                                className="p-2 hover:bg-slate-50 rounded-xl transition-all"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <Filter className="w-5 h-5 text-slate-400" />}
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4">الموظف</th>
                                        <th className="p-4">نوع الحركة</th>
                                        <th className="p-4">التوقت</th>
                                        <th className="p-4">الموقع</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {attendance.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-slate-400">
                                                لا توجد سجلات لليوم
                                            </td>
                                        </tr>
                                    ) : (
                                        attendance.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50/50">
                                                <td className="p-4 font-bold text-slate-700">
                                                    {log.profiles?.full_name || 'مستخدم محذوف'}
                                                    <span className="block text-xs text-slate-400 font-normal">
                                                        {log.profiles?.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${log.action_type === 'check_in'
                                                        ? 'bg-emerald-50 text-emerald-600'
                                                        : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                        {log.action_type === 'check_in' ? 'تسجيل دخول' : 'تسجيل خروج'}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-mono text-sm text-slate-600">
                                                    {new Date(log.timestamp).toLocaleTimeString('ar-EG')}
                                                </td>
                                                <td className="p-4 text-xs text-slate-400">
                                                    {log.location_lat && log.location_lng ? (
                                                        <a
                                                            href={`https://maps.google.com/?q=${log.location_lat},${log.location_lng}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-600 hover:underline"
                                                        >
                                                            عرض الخريطة
                                                        </a>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const MasterCard = ({ title, desc, icon: Icon, color, onClick }: MasterCardProps) => (
    <button
        onClick={onClick}
        className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-right flex flex-col items-start gap-4 group w-full"
    >
        <div className={`p-3 rounded-2xl ${color} group-hover:scale-110 transition-transform`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <h3 className="font-black text-slate-900 text-lg mb-1">{title}</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-bold">{desc}</p>
        </div>
        <div className="mt-auto pt-4 flex items-center text-blue-600 font-black text-[10px] uppercase tracking-widest gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            فتح الإعدادات
            <ChevronRight className="w-3 h-3 rotate-180" />
        </div>
    </button>
);

export default AdminConsole;
