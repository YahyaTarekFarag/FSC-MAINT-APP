import { useState, useEffect, useCallback } from 'react';
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
    Settings,
    Play,
    ChevronLeft,
    Square,
    Loader2,
    Map,
    Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';
import InstallPWA from '../components/InstallPWA';
import { useGeoLocation } from '../hooks/useGeoLocation';
import toast from 'react-hot-toast';
import { base64ToBlob } from '../utils/imageCompressor';
import { uploadTicketImage } from '../lib/storage';
import { syncClosures } from '../utils/offlineSync';
import NotificationCenter from '../components/common/NotificationCenter';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from '../components/ui/PageTransition';
import { CommandPalette } from '../components/ui/CommandPalette';
import TechnicianBottomNav from '../components/layout/TechnicianBottomNav';

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

    const isManager = profile?.role === 'manager';

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
            icon: Settings,
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
            label: 'خريطة الفروع',
            path: '/maps',
            icon: Map,
            show: isAdmin || isTechnician || isManager
        },
        {
            label: 'بلاغاتي',
            path: '/tickets',
            icon: ClipboardList,
            show: true
        },
        {
            label: 'إبلاغ عن عطل',
            path: '/tickets/new',
            icon: PlusCircle,
            show: true
        },
        {
            label: 'التقارير السيادية',
            path: '/reports',
            icon: ClipboardList,
            show: isAdmin || isManager
        },
        {
            label: 'الذكاء السيادي',
            path: '/admin/intelligence',
            icon: Zap,
            show: isAdmin || isManager
        }
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

        // Offline Sync Listener
        const handleOnline = () => {
            toast.success('تم استعادة الاتصال! جاري مزامنة البيانات... 📡');
            syncClosures(async (item: any) => {
                const { ticketId, data } = item;
                const { selectedParts, formAnswers, closedAt, repairCost, repairDuration } = data;

                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return; // Should not happen if logged in

                // 1. Process Inventory Transactions (Using RPC for consistency)
                if (selectedParts && selectedParts.length > 0) {
                    const partsPayload = selectedParts.map((p: any) => ({
                        part_id: p.id,
                        quantity: p.used_quantity
                    }));

                    const { error: rpcError } = await (supabase.rpc as any)('consume_parts', {
                        p_ticket_id: ticketId,
                        p_user_id: user.id,
                        p_parts: partsPayload
                    });

                    if (rpcError) throw rpcError;
                }

                // 2.1 Handle Offline Images in Form Data
                // Iterate through answers, find base64, upload, replace
                const processedAnswers = { ...formAnswers };

                for (const [key, value] of Object.entries(processedAnswers)) {
                    if (typeof value === 'string' && value.startsWith('data:image')) {
                        try {
                            const blob = await base64ToBlob(value);
                            const file = new File([blob], `offline_upload_${Date.now()}.jpg`, { type: 'image/jpeg' });
                            const url = await uploadTicketImage(file);
                            processedAnswers[key] = url;
                            console.log(`Uploaded offline image for Q${key}: ${url}`);
                        } catch (imgError) {
                            console.error(`Failed to upload offline image for Q${key}`, imgError);
                            // Maybe keep base64 or fail? Failing entire sync might be safer to prevent data loss.
                            // But for now let's just log and continue (image might be broken in DB but ticket closed)
                            // Ideally we should throw to retry later.
                            throw new Error(`Image upload failed for Q${key}`);
                        }
                    }
                }

                // 2. Fetch existing ticket form data to merge
                const { data: ticket } = await (supabase
                    .from('tickets' as any)
                    .select('form_data')
                    .eq('id', ticketId)
                    .single() as any);

                const mergedFormData = {
                    ...(ticket?.form_data || {}),
                    ...processedAnswers
                };

                // 3. Update Ticket
                const { error: updateError } = await (supabase
                    .from('tickets' as any)
                    .update({
                        status: 'closed',
                        closed_at: closedAt,
                        repair_cost: repairCost,
                        repair_duration: repairDuration,
                        form_data: mergedFormData
                    })
                    .eq('id', ticketId) as any);

                if (updateError) throw updateError;

                toast.success(`تم مزامنة البلاغ #${ticketId.slice(0, 8)} بنجاح ✅`);
            });
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    location_lng: coords.longitude
                }) as any);

            if (error) throw error;
            setIsShiftActive(!isShiftActive);
            toast.success(actionType === 'check_in' ? 'تم تسجيل بداية المناوبة بنجاح 🟢' : 'تم تسجيل نهاية المناوبة بنجاح 🔴', {
                style: {
                    background: '#10b981',
                    color: '#fff',
                    fontWeight: 'bold',
                    borderRadius: '1rem',
                },
                icon: actionType === 'check_in' ? '🟢' : '🔴'
            });
        } catch (err: any) {
            toast.error('فشل في تسجيل البصمة: ' + (err.message || err));
        } finally {
            setShiftLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent flex font-sans rtl" dir="rtl">
            {/* Sidebar Overlay (Mobile) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Hidden on mobile if technician (uses bottom nav) */}
            <aside className={`
                fixed inset-y-0 right-0 w-72 bg-slate-900/80 backdrop-blur-2xl border-l border-white/10 z-50 transform transition-transform duration-300 ease-in-out
                lg:translate-x-0 lg:static lg:inset-0
                ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
                ${isTechnician ? 'hidden lg:block' : ''}
            `}>
                <div className="h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                                <ClipboardList className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">نظام الصيانة</span>
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
                                        ? 'bg-blue-600/20 text-blue-400 shadow-sm border border-blue-500/20'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                `}
                            >
                                <item.icon className={`w-5 h-5 transition-colors`} />
                                <span>{item.label}</span>
                                <ChevronLeft className={`w-4 h-4 mr-auto transition-transform ${location.pathname === item.path ? 'rotate-0' : 'rotate-180'} group-hover:translate-x-1 lg:group-hover:-translate-x-1`} />
                            </NavLink>
                        ))}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 mt-auto border-t border-white/5 space-y-4 bg-white/5">
                        {/* Interactive Entity Contact */}
                        <div className="bg-white/40 backdrop-blur-xl p-5 rounded-[2rem] border border-white relative overflow-hidden group shadow-sm">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-transparent"></div>
                            <div className="relative z-10">
                                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mb-1 leading-none">الدعم السيادي</p>
                                <p className="text-sm text-slate-800 font-black">هل تواجه مشكلة تقنية؟</p>
                                <button
                                    onClick={() => window.open('https://wa.me/201201103604?text=طلب دعم فني - نظام الصيانة السيادي', '_blank')}
                                    className="text-blue-600 font-black text-xs mt-3 flex items-center gap-2 hover:translate-x-1 transition-transform bg-blue-50/50 px-3 py-1.5 rounded-full w-fit border border-blue-100/50"
                                >
                                    فتح محادثة واتساب
                                    <ChevronLeft className="w-3 h-3 rotate-180" />
                                </button>
                            </div>
                        </div>

                        {/* High-Visibility Logout */}
                        <div className="pt-2">
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-black text-slate-400 bg-white border border-slate-100 hover:bg-red-500 hover:text-white hover:border-red-600 hover:shadow-xl hover:shadow-red-500/20 transition-all duration-300 group active:scale-95"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/5 rounded-lg group-hover:bg-red-400 group-hover:text-white transition-colors">
                                        <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                    </div>
                                    <span className="text-sm">خروج آمن من النظام</span>
                                </div>
                                <ChevronLeft className="w-4 h-4 rotate-180 opacity-0 group-hover:opacity-100 transition-all" />
                            </button>
                            <p className="text-center text-[9px] text-slate-400 font-bold mt-3 uppercase tracking-widest opacity-50">Sovereign OS v3.0 // Secure Session</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-16 bg-black/40 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 lg:px-8 shrink-0 sticky top-0 z-30">
                    <button
                        className={`lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors ${isTechnician ? 'hidden' : ''}`}
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
                            <span className="text-sm font-bold text-white">{profile?.full_name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize
                  ${isAdmin ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}
                `}>
                                {profile?.role === 'admin' ? 'مدير نظام' : profile?.role === 'manager' ? 'مدير قطاع' : 'فني صيانة'}
                            </span>
                        </div>

                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                            {profile?.full_name?.charAt(0) || 'U'}
                        </div>

                        {profile && <NotificationCenter userId={profile.id} />}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-transparent pb-20 lg:pb-0">
                    {/* Added padding bottom for mobile nav space */}
                    <AnimatePresence mode="wait">
                        <PageTransition key={location.pathname} className="p-4 lg:p-8 min-h-full">
                            <Outlet />
                        </PageTransition>
                    </AnimatePresence>
                </main>
            </div>

            {/* Bottom Nav for Technicians */}
            {isTechnician && <TechnicianBottomNav />}

            <CommandPalette />
            <InstallPWA />
        </div>
    );
};

export default DashboardLayout;
