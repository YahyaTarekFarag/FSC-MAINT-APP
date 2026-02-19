import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-600/20 blur-3xl rounded-full"></div>
                    <AlertCircle className="w-32 h-32 text-blue-500 mx-auto relative z-10 animate-bounce" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-6xl font-black text-white">404</h1>
                    <h2 className="text-2xl font-bold text-slate-300">الصفحة غير موجودة</h2>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        يبدو أنك سلكت طريقاً سيادياً غير موجود، نوصي بالعودة إلى القاعدة الرئيسية.
                    </p>
                </div>

                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/40 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    <Home className="w-6 h-6" />
                    العودة للرئيسية
                </button>
            </div>
        </div>
    );
};

export default NotFound;
