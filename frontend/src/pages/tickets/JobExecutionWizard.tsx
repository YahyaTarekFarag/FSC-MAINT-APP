import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { SovereignWizard } from '../../components/tickets/SovereignWizard';
import { useGeofence } from '../../hooks/useGeofence';
import {
    MapPin,
    AlertTriangle,
    Loader2,
    Navigation,
    ArrowLeft,
    Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function JobExecutionWizard() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [ticket, setTicket] = useState<any>(null);
    const [branchLocation, setBranchLocation] = useState<{ lat: number, lng: number } | null>(null);

    // Geofencing Hook
    const geofence = useGeofence(branchLocation);

    useEffect(() => {
        async function fetchTicketData() {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('tickets')
                    .select('*, branch:branches(latitude, longitude, name_ar)')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setTicket(data);

                if (data.branch) {
                    setBranchLocation({
                        lat: data.branch.latitude,
                        lng: data.branch.longitude
                    });
                }
            } catch (err) {
                console.error('Error fetching ticket:', err);
                toast.error('خطأ في تحميل بيانات المهمة');
            } finally {
                setLoading(false);
            }
        }
        fetchTicketData();
    }, [id]);

    const handleComplete = async (formData: any) => {
        if (!geofence.isAllowed) {
            toast.error('يجب أن تكون في موقع العطل للمتابعة');
            return;
        }

        try {
            toast.loading('جاري تنفيذ المعالجة السيادية...', { id: 'executing' });

            // 1. Atomic Inventory Transaction (if spare part used)
            if (formData.spare_part_id && formData.quantity) {
                const { error: rpcError } = await supabase.rpc('consume_spare_part', {
                    p_part_id: formData.spare_part_id,
                    p_quantity: parseInt(formData.quantity, 10),
                    p_ticket_id: id
                });

                if (rpcError) throw rpcError;
            }

            // 2. Update ticket status and metadata
            const { error: updateError } = await supabase
                .from('tickets')
                .update({
                    status: 'resolved',
                    completion_notes: formData.technical_notes,
                    images_url: formData.evidence_image ? [formData.evidence_image] : [],
                    completed_at: new Date().toISOString()
                })
                .eq('id', id!);

            if (updateError) throw updateError;

            toast.success('تم إتمام المهمة بنجاح سيادي! ✨', { id: 'executing' });
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Execution Error:', err);
            toast.error(err.message || 'فشل تنفيذ العملية', { id: 'executing' });
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black p-4 md:p-8 font-sans rtl" dir="rtl">
            {/* Header */}
            <div className="max-w-xl mx-auto mb-8 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="text-right">
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">تذكرة صيانة سيادية</p>
                    <h2 className="text-white font-mono text-lg font-bold">#{id?.slice(0, 8)}</h2>
                </div>
            </div>

            {/* Geofence Guard Card */}
            <div className={`
                max-w-xl mx-auto mb-8 p-6 rounded-[2.5rem] backdrop-blur-2xl border transition-all duration-700 shadow-2xl
                ${geofence.isAllowed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}
            `}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl ${geofence.isAllowed ? 'bg-emerald-500' : 'bg-red-500'} shadow-[0_0_20px_rgba(0,0,0,0.3)]`}>
                            {geofence.isAllowed ? <Navigation className="w-6 h-6 text-white" /> : <AlertTriangle className="w-6 h-6 text-white" />}
                        </div>
                        <div>
                            <h2 className="text-white font-black text-lg">نظام الحرس الجغرافي</h2>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                                {geofence.isAllowed ? 'أنت ضمن النطاق المسموح' : 'أنت خارج نطاق المعالجة'}
                            </p>
                        </div>
                    </div>
                    <div className="text-left">
                        <p className="text-white font-mono text-2xl font-black">
                            {geofence.currentDistance ?? '--'}m
                        </p>
                        <div className="flex items-center gap-1 justify-end">
                            <Clock className="w-3 h-3 text-white/20" />
                            <p className="text-white/20 text-[10px] font-bold">تحديث نشط</p>
                        </div>
                    </div>
                </div>

                {!geofence.isAllowed && (
                    <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <MapPin className="w-5 h-5 text-red-400" />
                        <p className="text-white/60 text-sm font-medium">
                            يرجى التحرك مسافة <span className="text-white font-black">{Math.max(0, (geofence.currentDistance || 0) - geofence.maxRadius)}م</span> لفتح ميزات الإغلاق
                        </p>
                    </div>
                )}
            </div>

            {/* Implementation Guard */}
            <div className={`transition-all duration-700 ${geofence.isAllowed ? 'opacity-100 pointer-events-auto scale-100' : 'opacity-20 pointer-events-none grayscale scale-95'}`}>
                <SovereignWizard
                    formKey="ticket_maintenance_v1"
                    onComplete={handleComplete}
                    initialData={{
                        asset_id: ticket?.asset_id,
                        technical_notes: ''
                    }}
                />
            </div>
        </div>
    );
}
