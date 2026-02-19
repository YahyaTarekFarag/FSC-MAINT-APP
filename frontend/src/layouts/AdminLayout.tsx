import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Ticket,
    Users,
    Store,
    Settings,
    Search,
    Menu,
    X,
    Bell,
    LogOut,
    Shield,
    UserCog,
    FileInput,
    Map,
    Clock,
    ChevronLeft,
    Zap,
    Coins,
    ShieldAlert,
    BarChart3
} from 'lucide-react';
import type { Database } from '../lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AdminLayoutProps {
    profile: Profile | null;
    handleSignOut: () => Promise<void>;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ profile, handleSignOut }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const location = useLocation();

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }

        return () => window.removeEventListener('resize', handleResize);
    }, [location]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setSearchOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const navItems = [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'لوحة القيادة' },
        { path: '/admin/intelligence', icon: Zap, label: 'الذكاء السيادي' },
        { path: '/admin/finance', icon: BarChart3, label: 'المركز المالي' },
        { path: '/admin/payroll', icon: Coins, label: 'الأداء والرواتب' },
        { path: '/admin/tickets', icon: Ticket, label: 'إدارة البلاغات' },
        { path: '/admin/maintenance/schedules', icon: Clock, label: 'الصيانة الوقائية' },
        { path: '/admin/workforce/roster', icon: Users, label: 'سجل الفنيين' },
        { path: '/admin/map', icon: Map, label: 'الخريطة المباشرة' },
        { path: '/admin/users', icon: UserCog, label: 'إدارة المستخدمين', adminOnly: true },
        { path: '/admin/inventory', icon: Store, label: 'المخزن' },
        { path: '/admin/assets', icon: Settings, label: 'الأصول' },
        { path: '/admin/structure', icon: Users, label: 'الهيكل التنظيمي', adminOnly: true },
        { path: '/admin/settings/forms', icon: FileInput, label: 'نماذج الإغلاق', adminOnly: true },
        { path: '/admin/audit-logs', icon: ShieldAlert, label: 'الصندوق الأسود', adminOnly: true },
        { path: '/admin/settings/system', icon: Shield, label: 'إعدادات النظام', adminOnly: true },
    ];

    const filteredNavItems = navItems.filter(item => !item.adminOnly || profile?.role?.toLowerCase() === 'admin');

    return (
        <div className="min-h-screen bg-transparent flex font-sans rtl" dir="rtl">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed md:sticky top-0 h-screen w-72 bg-slate-900 text-white z-30
                    transition-transform duration-300 ease-in-out shadow-2xl border-l border-white/5
                    ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}
            >
                <div className="p-6 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">لوحة الإدارة</h1>
                            <p className="text-xs text-slate-400">نظام الصيانة الذكي</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
                    {filteredNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                                ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 font-bold'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }
                            `}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>

                <div className="absolute bottom-0 w-full p-4 border-t border-white/5 bg-slate-900/80 backdrop-blur-md">
                    <button
                        onClick={handleSignOut}
                        className="flex items-center justify-between px-6 py-4 rounded-2xl w-full text-slate-400 bg-white/5 border border-white/10 hover:bg-red-500 hover:text-white hover:border-red-600 transition-all group active:scale-95"
                    >
                        <div className="flex items-center gap-3">
                            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            <span className="font-black">خروج من السيادة</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 rotate-180" />
                    </button>
                    <p className="text-center text-[9px] text-slate-500 font-bold mt-3 uppercase tracking-widest opacity-30">Admin Secure Session // v3.0</p>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar */}
                <header className="bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        {/* Search Trigger */}
                        <div
                            onClick={() => setSearchOpen(true)}
                            className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl text-white/30 cursor-text hover:border-blue-500/50 hover:bg-white/10 transition-all w-96 group"
                        >
                            <Search className="w-4 h-4 group-hover:text-blue-500" />
                            <span className="text-sm">بحث سريع...</span>
                            <div className="mr-auto flex gap-1">
                                <kbd className="hidden sm:inline-block px-2 py-0.5 bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-white/40 shadow-sm">Ctrl</kbd>
                                <kbd className="hidden sm:inline-block px-2 py-0.5 bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-white/40 shadow-sm">K</kbd>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 transition-colors">
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-slate-200 ring-4 ring-slate-50">
                            {profile?.full_name?.charAt(0) || 'AD'}
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-8">
                    <Outlet />
                </main>
            </div>

            {/* Command Palette Modal (Quick Search) */}
            {searchOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh] px-4"
                    onClick={() => setSearchOpen(false)}
                >
                    <div
                        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                            <Search className="w-6 h-6 text-blue-600" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="ابحث عن موظف، رقم بلاغ، أو قطعة غيار..."
                                className="flex-1 text-lg outline-none placeholder:text-slate-300 font-medium"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <button onClick={() => setSearchOpen(false)} className="bg-slate-100 px-2 py-1 rounded-lg text-xs text-slate-500 font-bold hover:bg-slate-200">
                                ESC
                            </button>
                        </div>
                        <div className="p-2 max-h-[50vh] overflow-y-auto">
                            {searchTerm ? (
                                <div className="p-8 text-center text-slate-400">جاري البحث عن "{searchTerm}"...</div>
                            ) : (
                                <div className="p-8 text-center text-slate-400">
                                    <p>اكتب للبحث في جميع أقسام النظام</p>
                                    <div className="flex justify-center gap-2 mt-4 text-xs">
                                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">الموظفين</span>
                                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">البلاغات</span>
                                        <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">القطع</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLayout;
