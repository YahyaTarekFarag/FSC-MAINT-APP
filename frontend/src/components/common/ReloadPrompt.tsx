import { useState, useEffect, useCallback, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { RefreshCw } from 'lucide-react';

function ReloadPrompt() {
    const [needRefresh, setNeedRefresh] = useState(false);
    const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

    useEffect(() => {
        const update = registerSW({
            onNeedRefresh() {
                setNeedRefresh(true);
            },
            onOfflineReady() {
                console.log('App is ready for offline usage');
            },
            onRegistered(r) {
                console.log('SW Registered: ' + r);
            },
            onRegisterError(error) {
                console.log('SW registration error', error);
            },
        });
        updateSWRef.current = update;
    }, []);

    const close = useCallback(() => {
        setNeedRefresh(false);
    }, []);

    const handleUpdate = useCallback(() => {
        if (updateSWRef.current) {
            updateSWRef.current(true);
        }
    }, []);

    return (
        <>
            {needRefresh && (
                <div className="fixed bottom-6 left-6 z-[100] p-5 bg-slate-900/95 backdrop-blur shadow-2xl rounded-2xl border border-slate-700 max-w-md animate-in slide-in-from-bottom duration-500 dir-rtl">
                    <div className="flex gap-4">
                        <div className="bg-blue-600/20 p-3 rounded-xl h-fit">
                            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-white mb-1">تحديث للنظام متاح 🚀</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                تم إصدار نسخة جديدة من النظام مع تحسينات في الأداء.
                                <br />
                                يفضل التحديث الآن للحصول على أفضل تجربة.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleUpdate}
                                    className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/50"
                                >
                                    تحديث الآن
                                </button>
                                <button
                                    onClick={close}
                                    className="text-slate-400 hover:text-white text-sm font-medium px-4 transition-colors"
                                >
                                    تجاهل
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default ReloadPrompt;
