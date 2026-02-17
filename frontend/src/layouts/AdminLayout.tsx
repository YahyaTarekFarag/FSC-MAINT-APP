import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Ticket,
    Users,
    Store,
    Settings,
    FileText,
    Search,
    Menu,
    X,
    Bell,
    LogOut,
    Database,
    Shield,
    Briefcase,
    UserCog,
    FileInput
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    // Close sidebar on mobile when route changes
    useEffect(() => {
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    }, [location]);

    // Handle Quick Search (Cmd/Ctrl + K)
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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const navItems = [
        { path: '/admin/dashboard', icon: LayoutDashboard, label: 'لوحة البيانات' },
        { path: '/admin/tickets', icon: Ticket, label: 'إدارة البلاغات' },
        { path: '/admin/workforce/roster', icon: Users, label: 'سجل الفنيين' },
        { path: '/admin/workforce/assignments', icon: Briefcase, label: 'توزيع المهام' },
        { path: '/admin/users', icon: UserCog, label: 'إدارة المستخدمين' },
        { path: '/admin/inventory', icon: Store, label: 'المخزن' },
        { path: '/admin/structure', icon: Database, label: 'الهيكل التنظيمي' },
        { path: '/admin/settings/forms', icon: FileInput, label: 'نماذج الإغلاق' },
        { path: '/admin/settings/master-data', icon: Settings, label: 'البيانات الأساسية' },
        { path: '/admin/settings/system', icon: Shield, label: 'إعدادات النظام' },
        { path: '/admin/logs', icon: FileText, label: 'سجلات النشاط' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans" dir="rtl">
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
                    transition-transform duration-300 ease-in-out shadow-xl
                    ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                `}
            >
                <div className="p-6 flex items-center justify-between border-b border-slate-800">
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

                <div className="p-4 space-y-1">
                    {navItems.map((item) => (
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

                <div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>تسجيل الخروج</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between shadow-sm">
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
                            className="hidden md:flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-slate-400 cursor-text hover:border-blue-300 hover:shadow-sm transition-all w-96 group"
                        >
                            <Search className="w-4 h-4 group-hover:text-blue-500" />
                            <span className="text-sm">بحث سريع...</span>
                            <div className="mr-auto flex gap-1">
                                <kbd className="hidden sm:inline-block px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-500 shadow-sm">Ctrl</kbd>
                                <kbd className="hidden sm:inline-block px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-500 shadow-sm">K</kbd>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="relative p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 transition-colors">
                            <Bell className="w-6 h-6" />
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-slate-200 ring-4 ring-slate-50">
                            AD
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
