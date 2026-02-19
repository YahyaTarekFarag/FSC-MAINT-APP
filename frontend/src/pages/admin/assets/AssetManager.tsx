import { useState, useEffect } from 'react';
import QRScanner from '../../../components/shared/QRScanner';
import { supabase } from '../../../lib/supabase';
import {
    Edit,
    Trash2,
    Loader2,
    Package,
    MapPin,
    History,
    Plus,
    Search,
    QrCode,
    Download
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { AssetFormDialog } from './AssetFormDialog';
import { AssetHistoryDrawer } from '../../../components/assets/AssetHistoryDrawer';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { exportToExcel } from '../../../utils/exportUtils';
import type { Database } from '../../../lib/supabase';

type Asset = Database['public']['Tables']['maintenance_assets']['Row'] & {
    branches: { name_ar: string } | null;
    brands: { name_ar: string } | null;
    tickets?: { count: number }[]; // Relation returns array of objects with count
};

export default function AssetManager() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAssetForQR, setSelectedAssetForQR] = useState<Asset | null>(null);
    const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<Asset | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
    const [deleteAsset, setDeleteAsset] = useState<{ id: string, name: string } | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('maintenance_assets')
                .select(`
                    *,
                    branches(name_ar),
                    brands(name_ar),
                    tickets(count)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAssets(data as Asset[] || []);
        } catch (error: unknown) {
            const err = error as Error;
            toast.error('فشل تحميل الأصول: ' + err.message);
        } finally {
            setLoading(false);
        }
    };


    const handleDownloadQR = (assetId: string, assetName: string) => {
        const svg = document.querySelector('#qr-code-svg');
        if (!svg) {
            toast.error('فشل العثور على الكود');
            return;
        }

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = 1000;
            canvas.height = 1000;
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, 1000, 1000);
                ctx.drawImage(img, 0, 0, 1000, 1000);
            }
            const pngFile = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.download = `QR-${assetName}-${assetId.slice(0, 8)}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const handleDelete = async () => {
        if (!deleteAsset) return;

        try {
            const { error } = await supabase
                .from('maintenance_assets')
                .delete()
                .eq('id', deleteAsset.id);

            if (error) throw error;
            toast.success('تم حذف المعدة بنجاح');
            setDeleteAsset(null);
            fetchAssets();
        } catch (error: unknown) {
            const err = error as Error;
            toast.error('فشل الحذف: ' + err.message);
        }
    };

    const handleEdit = (asset: Asset) => {
        setAssetToEdit(asset);
        setIsFormOpen(true);
    };

    const filteredAssets = assets.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.branches?.name_ar.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleScan = (decodedText: string) => {
        // Find asset by ID or Serial from QR
        const assetId = decodedText.split('asset_id=')[1];
        const found = assets.find(a => a.id === assetId || a.serial_number === decodedText);
        if (found) {
            setSelectedAssetForHistory(found);
            setIsScannerOpen(false);
            toast.success(`تم العثور على: ${found.name}`);
        } else {
            toast.error('لم يتم العثور على المعدة');
        }
    };



    const handleExport = () => {
        const dataToExport = assets.map(a => ({
            'اسم المعدة': a.name,
            'السيريال': a.serial_number || '-',
            'الموديل': a.model_number || '-',
            'الفرع': a.branches?.name_ar || '-',
            'العلامة التجارية': a.brands?.name_ar || '-',
            'الحالة': a.status === 'Active' ? 'نشط' : a.status === 'Under Repair' ? 'تحت الصيانة' : 'خارج الخدمة',
            'تاريخ الشراء': a.purchase_date || '-',
            'عدد البلاغات': a.tickets?.[0]?.count || 0,
            'الصحة %': Math.max(0, 100 - ((a.tickets?.[0]?.count || 0) * 10))
        }));
        exportToExcel(dataToExport, `Assets_Report_${new Date().toISOString().split('T')[0]}`);
    };

    return (
        <div className="p-4 md:p-8 bg-transparent min-h-screen" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-2">
                        <Package className="w-8 h-8 text-blue-500" />
                        إدارة المعدات والأصول
                    </h1>
                    <p className="text-white/40 font-bold">تتبع حالة الماكينات وسجل صيانتها عبر الفروع</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <QrCode className="w-5 h-5 text-blue-400" />
                        <span className="hidden md:inline">مسح كود</span>
                    </button>
                    <button
                        onClick={handleExport}
                        className="bg-emerald-600/20 border border-emerald-500/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Download className="w-5 h-5" />
                        <span className="hidden md:inline">تصدير</span>
                    </button>
                    <button
                        onClick={() => {
                            setAssetToEdit(null);
                            setIsFormOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        إضافة معدة جديدة
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-8 group">
                <input
                    type="text"
                    placeholder="بحث باسم المعدة، السيريال، أو الفرع..."
                    className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-8 py-5 pr-14 text-white placeholder:text-white/20 shadow-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-6 top-5.5 w-7 h-7 text-white/20 group-focus-within:text-blue-500 transition-colors" />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <p className="text-slate-500 font-bold">جاري تحميل قائمة المعدات...</p>
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-20 text-center border border-white/10">
                    <Package className="w-20 h-20 text-white/5 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white/20">لا توجد معدات مطابقة للبحث</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredAssets.map(asset => (
                        <div key={asset.id} className="bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl hover:bg-white/10 transition-all group overflow-hidden relative">
                            {/* Status Badge */}
                            <div className={`absolute top-0 left-0 px-6 py-2 rounded-br-2xl text-[10px] font-black tracking-widest uppercase ${asset.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border-r border-b border-emerald-500/30' :
                                asset.status === 'Under Repair' ? 'bg-orange-500/20 text-orange-400 border-r border-b border-orange-500/30' :
                                    'bg-red-500/20 text-red-400 border-r border-b border-red-500/30'
                                }`}>
                                {asset.status === 'Active' ? 'نشط' : asset.status === 'Under Repair' ? 'تحت الصيانة' : 'خارج الخدمة'}
                            </div>

                            {/* Health Badge */}
                            {(() => {
                                const ticketCount = asset.tickets?.[0]?.count || 0;
                                const healthScore = Math.max(0, 100 - (ticketCount * 5));

                                let colorClass = 'bg-emerald-500/20 text-emerald-400 border-l border-b border-emerald-500/30';
                                if (healthScore < 50) colorClass = 'bg-red-500/20 text-red-400 border-l border-b border-red-500/30';
                                else if (healthScore < 80) colorClass = 'bg-amber-500/20 text-amber-400 border-l border-b border-amber-500/30';

                                return (
                                    <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl text-[10px] font-black flex items-center gap-1 ${colorClass}`}>
                                        <span className="animate-pulse">{healthScore}%</span>
                                        <span className="opacity-75 tracking-widest uppercase">صحة</span>
                                    </div>
                                );
                            })()}

                            <div className="flex items-start justify-between mb-6 mt-4">
                                <div>
                                    <h3 className="font-black text-white text-xl mb-1 tracking-tight">{asset.name}</h3>
                                    <div className="flex items-center gap-2 text-white/40 text-sm font-bold">
                                        <div className="p-1 bg-white/5 rounded-md">
                                            <MapPin className="w-3.5 h-3.5 text-blue-400" />
                                        </div>
                                        {asset.branches?.name_ar}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(asset)}
                                        className="p-3 bg-white/5 hover:bg-blue-500/20 text-white/40 hover:text-blue-400 rounded-2xl transition-all border border-white/5 hover:border-blue-500/30"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteAsset({ id: asset.id, name: asset.name })}
                                        className="p-3 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-2xl transition-all border border-white/5 hover:border-red-500/30"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/40 font-bold">السيريال:</span>
                                    <span className="text-white font-mono font-black bg-white/5 border border-white/10 px-3 py-1 rounded-xl">{asset.serial_number || '---'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/40 font-bold">العلامة التجارية:</span>
                                    <span className="text-white font-black">{asset.brands?.name_ar || '---'}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-white/40 font-bold">الموديل:</span>
                                    <span className="text-white font-black">{asset.model_number || '---'}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                <button
                                    onClick={() => setSelectedAssetForQR(asset)}
                                    className="flex items-center justify-center gap-2 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-[1.5rem] text-xs font-black transition-all border border-white/10"
                                >
                                    <QrCode className="w-4 h-4 text-blue-400" />
                                    كود QR
                                </button>
                                <button
                                    onClick={() => setSelectedAssetForHistory(asset)}
                                    className="flex items-center justify-center gap-2 py-3.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-[1.5rem] text-xs font-black transition-all border border-blue-500/20"
                                >
                                    <History className="w-4 h-4" />
                                    تاريخ الصيانة
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* QR Scanner */}
            {isScannerOpen && (
                <QRScanner
                    onScan={handleScan}
                    onClose={() => setIsScannerOpen(false)}
                />
            )}

            {/* QR Modal */}
            {selectedAssetForQR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelectedAssetForQR(null)} />
                    <div className="relative bg-slate-900 border border-white/20 rounded-[3rem] p-12 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="mb-8 p-8 bg-white rounded-[2.5rem] inline-block shadow-inner ring-8 ring-white/5">
                            <QRCodeSVG
                                id="qr-code-svg"
                                value={`${window.location.origin}/new-ticket?asset_id=${selectedAssetForQR.id}`}
                                size={200}
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2">{selectedAssetForQR.name}</h3>
                        <p className="text-white/40 font-bold text-sm mb-10">امسح الكود لفتح صفحة المعدة مباشرة</p>

                        <div className="flex gap-4">
                            <button
                                onClick={() => handleDownloadQR(selectedAssetForQR.id, selectedAssetForQR.name)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Download className="w-5 h-5" />
                                تحميل
                            </button>
                            <button
                                onClick={() => setSelectedAssetForQR(null)}
                                className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-4 rounded-2xl font-black transition-all"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Drawer */}
            <AssetHistoryDrawer
                isOpen={!!selectedAssetForHistory}
                onClose={() => setSelectedAssetForHistory(null)}
                assetId={selectedAssetForHistory?.id || ''}
                assetName={selectedAssetForHistory?.name || ''}
            />
            <AssetFormDialog
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchAssets}
                assetToEdit={assetToEdit}
            />

            <ConfirmDialog
                isOpen={!!deleteAsset}
                onCancel={() => setDeleteAsset(null)}
                onConfirm={handleDelete}
                title="حذف معدة"
                message={`هل أنت متأكد من حذف المعدة "${deleteAsset?.name}"؟ سيؤدي ذلك لحذف سجلاتها المرتبطة إذا وجدت.`}
                confirmLabel="حذف"
                cancelLabel="إلغاء"
                variant="danger"
            />
        </div>
    );
}
