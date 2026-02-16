import React, { useState, useEffect, useCallback } from 'react';
import {
    Settings,
    Package,
    Users,
    MapPin,
    Clock,
    Activity,
    Database as DbIcon,
    ChevronRight,
    Loader2,
    Calendar,
    Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

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
                .from('attendance_logs' as any)
                .select(`
          *,
          profiles:user_id(full_name, role)
        `)
                .order('timestamp', { ascending: false });

            if (error) throw error;
            setAttendance(data as any || []);
        } catch (err) {
            console.error('Error fetching attendance:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'attendance') {
            fetchAttendance();
        }
    }, [activeTab, fetchAttendance]);

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
                        onClick={() => setActiveTab(tab.id as any)}
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
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <MasterCard
                            title="إدارة التصنيفات"
                            desc="تعريف أنواع الأعطال وتصميم نماذج التشخيص"
                            icon={Settings}
                            color="bg-blue-50 text-blue-600"
                            onClick={() => navigate('/admin/settings/categories')}
                        />
                        <MasterCard
                            title="المخزون وقطع الغيار"
                            desc="متابعة الأرصدة وإعادة التعبئة"
                            icon={Package}
                            color="bg-cyan-50 text-cyan-600"
                            onClick={() => navigate('/admin/inventory')}
                        />
                        <MasterCard
                            title="إدارة البلاغات"
                            desc="عرض وتعديل تفاصيل جميع البلاغات"
                            icon={Activity}
                            color="bg-emerald-50 text-emerald-600"
                        />
                        <MasterCard
                            title="إدارة المستخدمين"
                            desc="إضافة وتعديل بيانات الموظفين والصلاحيات"
                            icon={Users}
                            color="bg-purple-50 text-purple-600"
                        />
                        <MasterCard
                            title="المواقع والفروع"
                            desc="تخصيص المواقع الجغرافية للفروع"
                            icon={MapPin}
                            color="bg-orange-50 text-orange-600"
                        />
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
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-400">
                                        <th className="p-6">الموظف</th>
                                        <th className="p-6">الإجراء</th>
                                        <th className="p-6">الوقت</th>
                                        <th className="p-6">الموقع</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading && attendance.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center">
                                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                                                <p className="text-slate-400 font-bold">جاري تحميل السجلات...</p>
                                            </td>
                                        </tr>
                                    ) : attendance.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center text-slate-400 italic font-medium">
                                                لا توجد سجلات حضور حتى الآن
                                            </td>
                                        </tr>
                                    ) : (
                                        attendance.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-6">
                                                    <p className="font-bold text-slate-900">{log.profiles?.full_name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{log.profiles?.role}</p>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${log.action_type === 'check_in'
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                        : 'bg-red-50 text-red-600 border-red-100'
                                                        }`}>
                                                        {log.action_type === 'check_in' ? 'بصمة دخول' : 'بصمة خروج'}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <p className="text-sm font-bold text-slate-700">
                                                        {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {new Date(log.timestamp).toLocaleDateString('ar-EG')}
                                                    </p>
                                                </td>
                                                <td className="p-6">
                                                    {log.location_lat ? (
                                                        <a
                                                            href={`https://www.google.com/maps?q=${log.location_lat},${log.location_lng}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-blue-600 hover:underline text-xs flex items-center gap-1 font-bold"
                                                        >
                                                            <MapPin className="w-3 h-3" />
                                                            عرض الخريطة
                                                        </a>
                                                    ) : <span className="text-slate-300 text-xs">غير متوفر</span>}
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

const MasterCard = ({ title, desc, icon: Icon, color, onClick }: { title: string; desc: string; icon: any; color: string; onClick?: () => void }) => (
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
