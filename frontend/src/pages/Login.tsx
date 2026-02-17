import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Auto-append domain for easy-access users if they just type 123 or 1234
        const email = username.includes('@') ? username : `${username}@system.com`;



        // ...

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            toast.success('تم تسجيل الدخول بنجاح');
            // Success is handled by App.tsx session listener
        } catch (err: unknown) {
            const error = err as Error;
            console.error('Login error:', error);
            const msg = error.message === 'Invalid login credentials'
                ? 'خطأ في اسم المستخدم أو كلمة المرور'
                : 'حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-4 font-sans rtl">
            {/* Background Decorative Elements */}
            <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700"></div>

            <div className="w-full max-w-md">
                {/* Glassmorphism Card */}
                <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden p-8 md:p-10">

                    {/* Logo/Icon */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-tr from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                            <LogIn className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">نظام الصيانة الذكي</h1>
                        <p className="text-blue-100/60 text-sm">أهلاً بك، يرجى تسجيل الدخول للمتابعة</p>
                    </div>

                    {error && (
                        <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl text-sm animate-shake">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-100 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                اسم المستخدم
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all group-hover:bg-white/10"
                                    placeholder="مثال: 123"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-blue-100 flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                كلمة المرور
                            </label>
                            <div className="relative group">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all group-hover:bg-white/10"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    جاري تسجيل الدخول...
                                </>
                            ) : (
                                'تسجيل الدخول'
                            )}
                        </button>
                    </form>

                    {/* Footer Info */}
                    <div className="mt-10 pt-6 border-t border-white/5 text-center">
                        <p className="text-white/40 text-xs">
                            &copy; 2026 شركة بلبن - إدارة الصيانة الهندسية
                        </p>
                    </div>
                </div>
            </div>

            {/* Shake animation for errors */}
            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
        </div>
    );
};

export default Login;
