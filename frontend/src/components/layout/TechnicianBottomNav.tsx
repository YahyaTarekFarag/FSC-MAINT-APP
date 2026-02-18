import { useNavigate, useLocation } from 'react-router-dom';
import { Home, List, User, Bell } from 'lucide-react';

export default function TechnicianBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 pb-safe z-50 flex justify-between items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden">
            <button
                onClick={() => navigate('/')}
                className={`flex flex-col items-center gap-1 ${isActive('/') ? 'text-blue-600' : 'text-slate-400'}`}
            >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive('/') ? 'bg-blue-50' : ''}`}>
                    <Home className={`w-6 h-6 ${isActive('/') ? 'fill-current' : ''}`} />
                </div>
                <span className="text-[10px] font-bold">الرئيسية</span>
            </button>

            <button
                onClick={() => navigate('/tickets')}
                className={`flex flex-col items-center gap-1 ${isActive('/tickets') ? 'text-blue-600' : 'text-slate-400'}`}
            >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive('/tickets') ? 'bg-blue-50' : ''}`}>
                    <List className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold">مهامي</span>
            </button>

            <button
                onClick={() => navigate('/notifications')} // Placeholder route
                className={`flex flex-col items-center gap-1 text-slate-400`}
            >
                <div className="p-1.5 rounded-xl">
                    <Bell className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold">تنبيهات</span>
            </button>

            <button
                onClick={() => navigate('/profile')} // Placeholder route
                className={`flex flex-col items-center gap-1 text-slate-400`}
            >
                <div className="p-1.5 rounded-xl">
                    <User className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold">حسابي</span>
            </button>
        </div>
    );
}
