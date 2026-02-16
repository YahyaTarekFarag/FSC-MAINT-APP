import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Show our custom installation banner
            setShowInstallBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        setDeferredPrompt(null);
        setShowInstallBanner(false);
    };

    if (!showInstallBanner) return null;

    return (
        <div className="fixed bottom-24 left-6 right-6 lg:left-auto lg:right-12 lg:w-96 z-50 animate-in slide-in-from-bottom-10 duration-700">
            <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-2xl border border-white/10 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                    <div className="bg-blue-600 p-2.5 rounded-2xl">
                        <Download className="w-6 h-6" />
                    </div>
                    <button
                        onClick={() => setShowInstallBanner(false)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div>
                    <h3 className="text-lg font-bold">تثبيت تطبيق بي لبان</h3>
                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">
                        قم بتثبيت التطبيق على شاشتك الرئيسية للوصول السريع ومتابعة البلاغات بسهولة أكبر.
                    </p>
                </div>

                <button
                    onClick={handleInstallClick}
                    className="w-full bg-white text-slate-900 font-black py-4 rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                >
                    تثبيت الآن
                </button>
            </div>
        </div>
    );
};

export default InstallPWA;
