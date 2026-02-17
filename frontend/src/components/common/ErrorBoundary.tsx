
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans rtl">
                    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        <h1 className="text-2xl font-bold text-slate-800 mb-2">عذراً، حدث خطأ غير متوقع</h1>
                        <p className="text-slate-500 mb-6">
                            واجه النظام مشكلة تقنية تمنع عرض هذه الصفحة. تم تسجيل الخطأ وسنعمل على حله.
                        </p>

                        {this.state.error && (
                            <div className="bg-slate-50 p-3 rounded-lg text-left text-xs text-slate-400 font-mono mb-6 overflow-auto max-h-32 dir-ltr">
                                {this.state.error.message}
                            </div>
                        )}

                        <button
                            onClick={this.handleReload}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-5 h-5" />
                            إعادة تحميل الصفحة
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
