import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MapPin,
    AlertTriangle,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { SovereignWizard } from '../../components/tickets/SovereignWizard';
import { useSovereignSchema } from '../../hooks/useSovereignSchema';
import type { Database } from '../../lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
});

interface LocationMarkerProps {
    setLocation: (loc: { lat: number; lng: number }) => void;
    setLocationError: (error: string | null) => void;
}

function LocationMarker({ setLocation, setLocationError }: LocationMarkerProps) {
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
            setLocationError(null);
        },
        locationfound(e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
            setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
            setLocationError(null);
        },
        locationerror() {
            setLocationError('تعذر تحديد موقعك تلقائياً. يرجى التحديد يدوياً على الخريطة.');
        }
    });

    useEffect(() => {
        map.locate();
    }, [map]);

    return position === null ? null : (
        <Marker position={position} />
    );
}

interface NewTicketProps {
    userProfile: Profile | null;
}

const NewTicket: React.FC<NewTicketProps> = ({ userProfile }) => {
    const navigate = useNavigate();
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [submittedTicket, setSubmittedTicket] = useState<any>(null);
    const [mapReady, setMapReady] = useState(false);

    // Sovereign Registry Integration
    const { schema, loading: schemaLoading } = useSovereignSchema('ticket_maintenance_v1');

    // Geofencing Logic
    const geofencingEnabled = userProfile?.role?.toLowerCase() === 'technician';
    const [geofenceValid, setGeofenceValid] = useState(true);
    const [distanceToBranch, setDistanceToBranch] = useState<number | null>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(userProfile?.branch_id || null);

    useEffect(() => {
        const timer = setTimeout(() => setMapReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const checkGeofence = async () => {
            if (!geofencingEnabled || !location || !selectedBranchId) {
                setGeofenceValid(true);
                return;
            }

            try {
                const { data: branch, error } = await (supabase.from('branches') as any)
                    .select('location_lat, location_lng')
                    .eq('id', selectedBranchId)
                    .single();

                if (error || !branch || (branch as any).location_lat === null || (branch as any).location_lng === null) {
                    setGeofenceValid(true);
                    return;
                }

                const dist = L.latLng(location.lat, location.lng).distanceTo(
                    L.latLng((branch as any).location_lat, (branch as any).location_lng)
                );

                setDistanceToBranch(Math.round(dist));
                setGeofenceValid(dist <= 200);
            } catch (err) {
                console.error('Geofence error:', err);
                setGeofenceValid(true);
            }
        };

        checkGeofence();
    }, [selectedBranchId, location, geofencingEnabled]);

    const handleWizardComplete = async (finalData: any) => {
        // Update selected branch from wizard if needed
        if (finalData.branch_id) {
            setSelectedBranchId(finalData.branch_id);
        }

        if (geofencingEnabled && !geofenceValid) {
            toast.error('لا يمكن إرسال البلاغ لأنك خارج نطاق الفرع المسموح (200 متر)');
            return;
        }

        try {
            const { data: ticket, error } = await (supabase.from('tickets') as any).insert({
                ...finalData,
                status: 'open',
                location_lat: location?.lat,
                location_lng: location?.lng,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).select().single();

            if (error) throw error;

            toast.success('تم إرسال البلاغ بنجاح');
            setSubmittedTicket(ticket);
        } catch (error: any) {
            console.error('Submission Error:', error);
            toast.error(`فشل الإرسال: ${error.message || 'خطأ غير معروف'}`);
        }
    };

    if (schemaLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-white/40 font-bold">جاري تحميل البروتوكول السيادي...</p>
            </div>
        );
    }

    if (submittedTicket) {
        return (
            <div className="max-w-xl mx-auto py-20 animate-in zoom-in duration-500 text-center space-y-8">
                <div className="bg-emerald-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/20">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-black text-white tracking-tight text-right">تم تسجيل البلاغ بنجاح!</h1>
                    <p className="text-white/40 font-medium text-right">رقم البلاغ السيادي: <span className="text-blue-400 font-mono">#{submittedTicket.id.slice(0, 8)}</span></p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 shadow-2xl backdrop-blur-xl space-y-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black transition-all shadow-xl shadow-blue-900/20"
                    >
                        العودة للرئيسية
                    </button>
                    <p className="text-xs text-white/20 font-medium">تم توثيق البلاغ في السجل السيادي للمؤسسة</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 rtl text-right" dir="rtl">
            <div className="flex items-center gap-4 mb-10 bg-white/5 p-6 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
                <div className="bg-amber-500/20 p-4 rounded-2xl border border-amber-500/30">
                    <AlertTriangle className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white">{schema?.title || 'إبلاغ عن عطل'}</h1>
                    <p className="text-white/40 font-medium mt-1">تأكد من دقة البيانات لضمان سرعة الاستجابة السيادية</p>
                </div>
            </div>

            <div className="bg-white/5 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl mb-8 relative z-0 backdrop-blur-xl">
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="font-black text-white flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-400" />
                        تأكيد الإحداثيات الجغرافية
                    </h3>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-2 ${location ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                        {location ? (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                تم التحديد
                            </>
                        ) : (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                جاري التحديد...
                            </>
                        )}
                    </div>
                </div>

                <div className="h-72 w-full relative bg-slate-900/50">
                    {mapReady && (
                        <MapContainer
                            center={[24.7136, 46.6753]}
                            zoom={13}
                            scrollWheelZoom={false}
                            className="h-full w-full z-0"
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <LocationMarker setLocation={setLocation} setLocationError={setLocationError} />
                        </MapContainer>
                    )}
                    {locationError && (
                        <div className="absolute inset-0 z-10 bg-slate-900/80 flex items-center justify-center p-10 text-center">
                            <div className="space-y-4">
                                <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
                                <p className="text-white font-bold">{locationError}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full text-sm font-bold transition-all"
                                >
                                    إعادة المحاولة
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-8">
                <SovereignWizard
                    formKey="ticket_maintenance_v1"
                    onComplete={handleWizardComplete}
                    initialData={{
                        branch_id: userProfile?.branch_id
                    }}
                    context={{
                        branchId: userProfile?.branch_id || undefined
                    }}
                />

                {geofencingEnabled && distanceToBranch !== null && (
                    <div className={`p-6 rounded-[2rem] border-2 backdrop-blur-xl flex items-start gap-4 animate-in fade-in duration-500 ${geofenceValid ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                        {geofenceValid ? <CheckCircle2 className="w-8 h-8 shrink-0" /> : <AlertTriangle className="w-8 h-8 shrink-0" />}
                        <div>
                            <p className="font-black text-xl">
                                {geofenceValid ? 'نطاق جغرافي سيادي معتمد' : 'خارج نطاق التغطية'}
                            </p>
                            <p className="font-medium opacity-60 mt-1">
                                المسافة للفرع: {distanceToBranch} متر (الحد الأقصى: 200 متر)
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewTicket;
