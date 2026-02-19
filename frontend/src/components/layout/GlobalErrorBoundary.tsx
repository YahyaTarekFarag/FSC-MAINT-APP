import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Uncaught error in UI rendering:', error, errorInfo);
    }

    private handleRefresh = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div
                    className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0f172a] to-black flex items-center justify-center p-6 rtl font-sans"
                    dir="rtl"
                >
                    <div className="max-w-md w-full bg-white/5 backdrop-blur-2xl border border-red-500/20 rounded-[2.5rem] p-8 text-center shadow-[0_0_50px_-12px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 bg-red-500/10 rounded-3xl border border-red-500/20 flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                            عذراً، حدث خطأ غير متوقع في واجهة المستخدم.
                        </h1>
                        <p className="text-white/40 font-medium mb-8 leading-relaxed">
                            تعذر تحميل هذه الصفحة بسبب خطأ برمجي طارئ. فريق السيادة تم إبلاغه وجاري المعالجة.
                        </p>

                        {/* Optional Error Details - uncomment for dev */}
                        {/* <div className="text-left bg-black/40 p-4 rounded-xl text-red-400 text-xs font-mono overflow-auto mb-6 max-h-32 border border-white/5">
                            {this.state.error?.toString()}
                        </div> */}

                        <button
                            onClick={this.handleRefresh}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-900/40 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 group border border-white/10"
                        >
                            تحديث الصفحة
                            <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
