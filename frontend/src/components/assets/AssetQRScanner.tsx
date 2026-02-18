import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Camera, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AssetQRScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (assetId: string) => void;
}

export const AssetQRScanner = ({ isOpen, onClose, onScanSuccess }: AssetQRScannerProps) => {
    const [scannerActive, setScannerActive] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        let scanner: Html5QrcodeScanner | null = null;

        const startScanner = () => {
            scanner = new Html5QrcodeScanner(
                "qr-reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                /* verbose= */ false
            );

            scanner.render((decodedText) => {
                // Handle different URL formats
                // Expected format: .../new-ticket?asset_id=UUID
                try {
                    const url = new URL(decodedText);
                    const assetId = url.searchParams.get('asset_id');

                    if (assetId) {
                        scanner?.clear();
                        onScanSuccess(assetId);
                        onClose();
                    } else {
                        toast.error('كود QR غير صالح - لم يتم العثور على معرف المعدة');
                    }
                } catch (err) {
                    console.debug('QR Scan Error:', err);
                    // Fallback for raw UUIDs
                    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedText)) {
                        scanner?.clear();
                        onScanSuccess(decodedText);
                        onClose();
                    } else {
                        toast.error('كود QR غير صالح');
                    }
                }
            }, (error) => {
                if (error) {
                    // Soft error (scanning in progress) - ignore to avoid console spam
                }
            });

            setScannerActive(true);
        };

        // Give DOM time to render the reader div
        const timeout = setTimeout(startScanner, 100);

        return () => {
            clearTimeout(timeout);
            if (scanner) {
                scanner.clear().catch(error => {
                    console.error("Failed to clear scanner", error);
                });
            }
            setScannerActive(false);
        };
    }, [isOpen, onScanSuccess, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" dir="rtl">
            <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl">
                            <Camera className="w-6 h-6 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-black text-slate-800">ماسح الأكواد</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Reader Area */}
                <div className="p-6">
                    <div id="qr-reader" className="overflow-hidden rounded-3xl border-2 border-slate-100 bg-slate-50 min-h-[300px] flex items-center justify-center">
                        {!scannerActive && (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                                <p className="text-slate-400 font-bold">جاري تشغيل الكاميرا...</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                        <p className="text-blue-800 text-xs font-bold leading-relaxed">
                            قم بتوجيه الكاميرا نحو كود QR الملصق على المعدة للوصول السريع لصفحة البلاغات.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-black hover:bg-slate-100 transition-all"
                    >
                        إلغاء المسح
                    </button>
                </div>
            </div>
        </div>
    );
};
