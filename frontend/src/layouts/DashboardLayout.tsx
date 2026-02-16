import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    MapPin,
    Users,
    ClipboardList,
    PlusCircle,
    LogOut,
    Menu,
    X,
    Bell,
    ChevronLeft,
    Monitor,
    Play,
    Square,
    Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';
import InstallPWA from '../components/InstallPWA';
import { useGeoLocation } from '../hooks/useGeoLocation';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface DashboardLayoutProps {
    profile: Profile | null;
    handleSignOut: () => Promise<void>;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ profile, handleSignOut }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const isAdmin = profile?.role === 'admin';
    const isTechnician = profile?.role === 'technician';

    const menuItems = [
        {
            label: 'لوحة التحكم',
            path: '/dashboard',
            icon: LayoutDashboard,
            show: true
        },
        {
            label: 'إدارة النظام',
            path: '/admin/console',
            icon: Monitor,
            show: isAdmin
        },
        {
            label: 'الفروع',
            path: '/branches',
            icon: MapPin,
            show: isAdmin
        },
        {
            label: 'الموظفين',
            path: '/staff',
            icon: Users,
            show: isAdmin
        },
        {
            label: 'بلاغاتي',
            path: '/tickets',
            icon: ClipboardList,
            show: isTechnician || isAdmin
        },
        {
            label: 'إبلاغ عن عطل',
            path: '/tickets/new',
            icon: PlusCircle,
            show: true
        },
    ];

    const { getCoordinates } = useGeoLocation();
    const [isShiftActive, setIsShiftActive] = useState(false);
    const [shiftLoading, setShiftLoading] = useState(false);

    const checkShiftStatus = useCallback(async () => {
        if (!profile) return;
        const { data } = await (supabase
            .from('attendance_logs' as any)
            .select('action_type')
            .eq('user_id', profile.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle() as any);

        if (data && data.action_type === 'check_in') {
            setIsShiftActive(true);
        } else {
            setIsShiftActive(false);
        }
    }, [profile]);

    useEffect(() => {
        checkShiftStatus();
    }, [checkShiftStatus]);

    const toggleShift = async () => {
        if (!profile) return;
        setShiftLoading(true);
        try {
            const coords = await getCoordinates();
            const actionType = isShiftActive ? 'check_out' : 'check_in';

            const { error } = await (supabase
                .from('attendance_logs' as any)
                .insert({
                    user_id: profile.id,
                    action_type: actionType,
                    location_lat: coords.latitude,
                    location_lng: coords.longitude,
                    device_info: navigator.userAgent
                }) as any);

            if (error) throw error;
            setIsShiftActive(!isShiftActive);
            alert(actionType === 'check_in' ? 'تم تسجيل بداية المناوبة بنجاح 🟢' : 'تم تسجيل نهاية المناوبة بنجاح 🔴');
        } catch (err: any) {
            alert('فشل في تسجيل البصمة: ' + (err.message || err));
        } finally {
            setShiftLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans rtl" dir="rtl">
            {/* Sidebar Overlay (Mobile) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 right-0 w-72 bg-white border-l border-slate-200 z-50 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
                <div className="h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                                <ClipboardList className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-slate-900">نظام الصيانة</span>
                        </div>
                        <button
                            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 transition-colors"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {menuItems.filter(item => item.show).map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group
                  ${isActive
                                        ? 'bg-blue-50 text-blue-600 shadow-sm'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                `}
                            >
                                <item.icon className={`w-5 h-5 transition-colors`} />
                                <span>{item.label}</span>
                                <ChevronLeft className={`w-4 h-4 mr-auto transition-transform ${location.pathname === item.path ? 'rotate-0' : 'rotate-180'} group-hover:translate-x-1 lg:group-hover:-translate-x-1`} />
                            </NavLink>
                        ))}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-slate-100 space-y-2">
                        <div className="bg-slate-50 p-4 rounded-2xl mb-4">
                            <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">الدعم الفني</p>
                            <p className="text-sm text-slate-600">هل تواجه مشكلة؟</p>
                            <button className="text-blue-600 font-bold text-sm mt-1 hover:underline">اتصل بنا</button>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-all"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>تسجيل الخروج</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
                    <button
                        className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center gap-4 mr-auto lg:mr-0">
                        {/* Shift Control */}
                        <button
                            onClick={toggleShift}
                            disabled={shiftLoading}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all
                                ${isShiftActive
                                    ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'}
                                ${shiftLoading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {shiftLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isShiftActive ? (
                                <Square className="w-3 h-3 fill-current" />
                            ) : (
                                <Play className="w-3 h-3 fill-current" />
                            )}
                            {isShiftActive ? 'إنهاء المناوبة' : 'بدء المناوبة'}
                        </button>

                        <div className="hidden sm:flex flex-col items-start rtl:items-end">
                            <span className="text-sm font-bold text-slate-900">{profile?.full_name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize
                  ${isAdmin ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}
                `}>
                                {profile?.role === 'admin' ? 'مدير نظام' : profile?.role === 'manager' ? 'مدير قطاع' : 'فني صيانة'}
                            </span>
                        </div>

                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>

                        <button className="p-2 text-slate-400 hover:text-blue-600 relative transition-colors">
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <Outlet />
                </main>
            </div>
            <InstallPWA />
        </div>
    );
};

export default DashboardLayout;
