import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Box,
    Calendar,
    Cpu,
    FileText,
    History,
    MapPin,
    QrCode,
    Settings,
    ShieldCheck,
    CheckCircle2,
    Clock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AssetDetail {
    id: string;
    name: string;
    serial_number: string;
    model_number: string;
    status: 'active' | 'maintenance' | 'retired' | 'disposed';
    purchase_date: string;
    warranty_expiry: string;
    notes: string;
    branch_id: string;
    branches: {
        name_ar: string;
    };
}

interface Ticket {
    id: string;
    ticket_number: number;
    created_at: string;
    status: string;
    fault_category: string;
    description: string;
}

const AssetDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [asset, setAsset] = useState<AssetDetail | null>(null);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAssetDetails = async () => {
            if (!id) return;

            try {
                // Fetch Asset
                const { data: assetData, error: assetError } = await supabase
                    .from('technician_workload_view')
                    .select('*, branches(name_ar)')
                    .eq('id', id)
                    .single();

                if (assetError) throw assetError;
                setAsset(assetData as unknown as AssetDetail);

                // Fetch Linked Tickets
                const { data: ticketData, error: ticketError } = await supabase
                    .from('tickets')
                    .select('id, ticket_number, created_at, status, fault_category, description')
                    .eq('asset_id', id)
                    .order('created_at', { ascending: false });

                if (ticketError) throw ticketError;
                setTickets(ticketData as Ticket[] || []);

            } catch (error) {
                console.error('Error fetching details:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAssetDetails();
    }, [id]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700';
            case 'maintenance': return 'bg-orange-100 text-orange-700';
            case 'retired': return 'bg-slate-100 text-slate-700';
            case 'disposed': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'نشط';
            case 'maintenance': return 'في الصيانة';
            case 'retired': return 'متقاعد';
            case 'disposed': return 'تالف/مباع';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-pulse flex flex-col items-center">
                    <Box className="w-12 h-12 text-slate-200 mb-4" />
                    <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
                </div>
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="text-center py-20">
                <Box className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-700">الأصل غير موجود</h3>
                <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">
                    العودة للخلف
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                    <ArrowRight className="w-5 h-5 text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        {asset.name}
                        <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(asset.status)}`}>
                            {getStatusLabel(asset.status)}
                        </span>
                    </h1>
                    <p className="text-slate-500 flex items-center gap-2 mt-1">
                        <MapPin className="w-4 h-4" />
                        {asset.branches?.name_ar || 'غير محدد'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <Box className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-slate-800">بيانات الأصل</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">الرقم التسلسلي</label>
                                <p className="font-mono text-slate-700 bg-slate-50 px-3 py-1 rounded-lg inline-block border border-slate-100">
                                    {asset.serial_number || '-'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">رقم الموديل</label>
                                <p className="font-medium text-slate-700 flex items-center gap-2">
                                    <Cpu className="w-4 h-4 text-slate-400" />
                                    {asset.model_number || '-'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">تاريخ الشراء</label>
                                <p className="font-medium text-slate-700 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    {asset.purchase_date ? format(new Date(asset.purchase_date), 'dd MMMM yyyy', { locale: ar }) : '-'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">انتهاء الضمان</label>
                                <p className={`font-medium flex items-center gap-2 ${asset.warranty_expiry && new Date(asset.warranty_expiry) < new Date()
                                    ? 'text-red-600'
                                    : 'text-green-600'
                                    }`}>
                                    <ShieldCheck className="w-4 h-4" />
                                    {asset.warranty_expiry ? format(new Date(asset.warranty_expiry), 'dd MMMM yyyy', { locale: ar }) : '-'}
                                </p>
                            </div>
                        </div>
                        {asset.notes && (
                            <div className="px-6 pb-6 pt-0">
                                <label className="text-xs text-slate-400 font-medium block mb-2">ملاحظات</label>
                                <div className="bg-slate-50 p-4 rounded-xl text-slate-600 text-sm leading-relaxed border border-slate-100">
                                    {asset.notes}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Maintenance History */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="bg-purple-100 p-2 rounded-lg">
                                    <History className="w-5 h-5 text-purple-600" />
                                </div>
                                <h3 className="font-bold text-slate-800">سجل البلاغات والصيانة</h3>
                            </div>
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                                {tickets.length} بلاغ
                            </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {tickets.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                                    <CheckCircle2 className="w-12 h-12 mb-3 opacity-20" />
                                    <p>سجل نظيف! لا توجد بلاغات سابقة لهذا الأصل.</p>
                                </div>
                            ) : (
                                tickets.map(ticket => (
                                    <div key={ticket.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${ticket.status === 'resolved' || ticket.status === 'closed' ? 'bg-green-500' : 'bg-orange-500'
                                            }`} />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-slate-800 text-sm">
                                                    #{ticket.ticket_number} - {ticket.fault_category}
                                                </h4>
                                                <span className="text-xs text-slate-400">
                                                    {format(new Date(ticket.created_at), 'dd/MM/yyyy')}
                                                </span>
                                            </div>
                                            <p className="text-slate-600 text-sm line-clamp-2 mb-2">
                                                {ticket.description}
                                            </p>
                                            <div className="flex gap-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ticket.status === 'closed'
                                                    ? 'bg-green-50 text-green-700 border-green-100'
                                                    : 'bg-orange-50 text-orange-700 border-orange-100'
                                                    }`}>
                                                    {ticket.status === 'closed' ? 'مغلق' : 'قيد المعالجة'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-slate-400" />
                            إجراءات سريعة
                        </h3>
                        <div className="space-y-3">
                            <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium py-3 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2">
                                <QrCode className="w-4 h-4" />
                                طباعة ملصق QR
                            </button>
                            <button className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium py-3 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2">
                                <FileText className="w-4 h-4" />
                                تقرير صيانة
                            </button>
                            <button className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-3 rounded-xl border border-blue-200 transition-all flex items-center justify-center gap-2">
                                <History className="w-4 h-4" />
                                جدولة صيانة دورية
                            </button>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl text-white shadow-lg overflow-hidden relative">
                        <div className="relative z-10">
                            <h3 className="font-bold text-lg mb-1">حالة الضمان</h3>
                            <p className="text-slate-300 text-sm mb-4">
                                {asset.warranty_expiry ? (
                                    <>ينتهي في {format(new Date(asset.warranty_expiry), 'dd MMMM yyyy', { locale: ar })}</>
                                ) : 'لا يوجد ضمان مسجل'}
                            </p>

                            {asset.warranty_expiry && (
                                <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3">
                                    <Clock className="w-8 h-8 text-orange-400" />
                                    <div>
                                        <p className="text-xs text-slate-300">المدة المتبقية</p>
                                        <p className="font-bold text-lg">
                                            {Math.max(0, Math.ceil((new Date(asset.warranty_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} يوم
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <ShieldCheck className="absolute -bottom-6 -left-6 w-32 h-32 text-white/5 rotate-12" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssetDetails;
