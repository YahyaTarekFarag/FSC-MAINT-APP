import { useNavigate, useLocation } from 'react-router-dom';
import { Home, List, User, Bell } from 'lucide-react';

export default function TechnicianBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 ps-6 pe-6 py-3 pb-safe z-50 flex justify-between items-center shadow-2xl md:hidden">
            <button
                onClick={() => navigate('/')}
                className={`flex flex-col items-center gap-1 ${isActive('/') ? 'text-blue-400' : 'text-white/40'}`}
            >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive('/') ? 'bg-blue-500/10' : ''}`}>
                    <Home className={`w-6 h-6 ${isActive('/') ? 'fill-current' : ''}`} />
                </div>
                <span className="text-[10px] font-bold">الرئيسية</span>
            </button>

            <button
                onClick={() => navigate('/tickets')}
                className={`flex flex-col items-center gap-1 ${isActive('/tickets') ? 'text-blue-400' : 'text-white/40'}`}
            >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive('/tickets') ? 'bg-blue-500/10' : ''}`}>
                    <List className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold">مهامي</span>
            </button>

            <button
                onClick={() => navigate('/notifications')}
                className={`flex flex-col items-center gap-1 text-white/40`}
            >
                <div className="p-1.5 rounded-xl">
                    <Bell className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold">تنبيهات</span>
            </button>

            <button
                onClick={() => navigate('/')} // Back to Home as placeholder
                className={`flex flex-col items-center gap-1 text-white/40`}
            >
                <div className="p-1.5 rounded-xl">
                    <User className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold">حسابي</span>
            </button>
        </div>
    );
}
