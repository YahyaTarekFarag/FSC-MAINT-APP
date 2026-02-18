import { useState, useEffect } from 'react';
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
            setAssets(data as any || []);
        } catch (error: any) {
            toast.error('فشل تحميل الأصول: ' + error.message);
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
        } catch (error: any) {
            toast.error('فشل الحذف: ' + error.message);
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
        <div className="p-4 md:p-8 bg-slate-50 min-h-screen" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Package className="w-8 h-8 text-blue-600" />
                        إدارة المعدات والأصول
                    </h1>
                    <p className="text-slate-500 font-bold">تتبع حالة الماكينات وسجل صيانتها عبر الفروع</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                        <Download className="w-5 h-5" />
                        <span className="hidden md:inline">تصدير</span>
                    </button>
                    <button
                        onClick={() => {
                            setAssetToEdit(null);
                            setIsFormOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        إضافة معدة جديدة
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <input
                    type="text"
                    placeholder="بحث باسم المعدة، السيريال، أو الفرع..."
                    className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 pr-12 text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-bold"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-4 top-4.5 w-6 h-6 text-slate-400" />
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <p className="text-slate-500 font-bold">جاري تحميل قائمة المعدات...</p>
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="bg-white rounded-3xl p-20 text-center border border-slate-100 shadow-sm">
                    <Package className="w-20 h-20 text-slate-100 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">لا توجد معدات مطابقة للبحث</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssets.map(asset => (
                        <div key={asset.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                            {/* Status Badge */}
                            <div className={`absolute top-0 left-0 px-4 py-1 rounded-br-2xl text-[10px] font-black ${asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                                asset.status === 'Under Repair' ? 'bg-orange-100 text-orange-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                {asset.status === 'Active' ? 'نشط' : asset.status === 'Under Repair' ? 'تحت الصيانة' : 'خارج الخدمة'}
                            </div>

                            {/* Health Badge */}
                            {(() => {
                                const ticketCount = asset.tickets?.[0]?.count || 0;
                                // Health Score = 100 - (Ticket Count * 5) - (Repair Cost Impact - placeholder)
                                // We use a simpler heuristic for now: 100 - (Tickets * 5)
                                const healthScore = Math.max(0, 100 - (ticketCount * 5));

                                let colorClass = 'bg-emerald-100 text-emerald-700';
                                if (healthScore < 50) colorClass = 'bg-red-100 text-red-700';
                                else if (healthScore < 80) colorClass = 'bg-amber-100 text-amber-700';

                                return (
                                    <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-2xl text-[10px] font-black flex items-center gap-1 ${colorClass}`}>
                                        <span>{healthScore}%</span>
                                        <span className="opacity-75">صحة</span>
                                    </div>
                                );
                            })()}

                            <div className="flex items-start justify-between mb-4 mt-2">
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg mb-1">{asset.name}</h3>
                                    <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                                        <MapPin className="w-3 h-3" />
                                        {asset.branches?.name_ar}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(asset)}
                                        className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setDeleteAsset({ id: asset.id, name: asset.name })}
                                        className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-bold">السيريال:</span>
                                    <span className="text-slate-700 font-mono font-bold bg-slate-50 px-2 rounded">{asset.serial_number || '---'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-bold">العلامة التجارية:</span>
                                    <span className="text-slate-700 font-bold">{asset.brands?.name_ar || '---'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-bold">الموديل:</span>
                                    <span className="text-slate-700 font-bold">{asset.model_number || '---'}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                                <button
                                    onClick={() => setSelectedAssetForQR(asset)}
                                    className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-black transition-all"
                                >
                                    <QrCode className="w-4 h-4" />
                                    كود QR
                                </button>
                                <button
                                    onClick={() => setSelectedAssetForHistory(asset)}
                                    className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-black transition-all"
                                >
                                    <History className="w-4 h-4" />
                                    تاريخ الصيانة
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* QR Modal */}
            {selectedAssetForQR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedAssetForQR(null)} />
                    <div className="relative bg-white rounded-[40px] p-10 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="mb-6 p-6 bg-slate-50 rounded-[32px] inline-block">
                            <QRCodeSVG
                                id="qr-code-svg"
                                value={`${window.location.origin}/new-ticket?asset_id=${selectedAssetForQR.id}`}
                                size={200}
                                level="H"
                                includeMargin={true}
                            />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">{selectedAssetForQR.name}</h3>
                        <p className="text-slate-500 font-bold text-sm mb-8">امسح الكود لفتح صفحة المعدة مباشرة</p>

                        <div className="flex gap-4">
                            <button
                                onClick={() => handleDownloadQR(selectedAssetForQR.id, selectedAssetForQR.name)}
                                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                تحميل الكود
                            </button>
                            <button
                                onClick={() => setSelectedAssetForQR(null)}
                                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black"
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
