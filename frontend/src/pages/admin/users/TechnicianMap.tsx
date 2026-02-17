import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../../lib/supabase';
import { Loader2, User, Navigation } from 'lucide-react';
import L from 'leaflet';
import { calculateDistance } from '../../../utils/helpers';

// Fix Leaflet Text
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icon for Target Branch
const TargetIcon = L.divIcon({
    className: 'bg-transparent',
    html: `<div class="w-8 h-8 bg-red-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
});

type Technician = {
    id: string;
    full_name: string | null;
    last_lat: number | null;
    last_lng: number | null;
    last_seen_at: string | null;
    status: 'active' | 'suspended';
    phone: string | null;
    role?: 'admin' | 'manager' | 'technician';
};

interface TechnicianMapProps {
    targetLocation?: { lat: number; lng: number; label?: string } | null;
    className?: string;
}

const TechnicianMap: React.FC<TechnicianMapProps> = ({ targetLocation, className }) => {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTechnicians = async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, last_lat, last_lng, last_seen_at, status, phone')
                .eq('role', 'technician')
                .not('last_lat', 'is', null);

            if (data) {
                setTechnicians(data as Technician[]);
            }
            setLoading(false);
        };

        fetchTechnicians();

        // Real-time subscription
        const subscription = supabase
            .channel('public:profiles')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                const updatedUser = payload.new as Technician;
                if (updatedUser.role === 'technician' && updatedUser.last_lat) {
                    setTechnicians(prev => {
                        const index = prev.findIndex(t => t.id === updatedUser.id);
                        if (index !== -1) {
                            const newList = [...prev];
                            newList[index] = { ...newList[index], ...updatedUser };
                            return newList;
                        } else {
                            return [...prev, updatedUser];
                        }
                    });
                }
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    // Center map: if target exists, use it, otherwise default types
    const center = targetLocation ? [targetLocation.lat, targetLocation.lng] : [30.0444, 31.2357];

    return (
        <div className={`rounded-2xl overflow-hidden shadow-lg border border-slate-200 relative ${className || 'h-[calc(100vh-100px)]'}`}>
            <MapContainer center={center as L.LatLngExpression} zoom={targetLocation ? 12 : 6} scrollWheelZoom={true} className="h-full w-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Render Target Branch */}
                {targetLocation && (
                    <Marker position={[targetLocation.lat, targetLocation.lng]} icon={TargetIcon}>
                        <Popup>
                            <div className="font-bold text-slate-900">{targetLocation.label || 'موقع العطل'}</div>
                        </Popup>
                    </Marker>
                )}

                {/* Render Technicians */}
                {technicians.map(tech => {
                    if (!tech.last_lat || !tech.last_lng) return null;

                    const distance = targetLocation
                        ? calculateDistance(targetLocation.lat, targetLocation.lng, tech.last_lat, tech.last_lng)
                        : null;

                    return (
                        <div key={tech.id}>
                            <Marker position={[tech.last_lat, tech.last_lng]}>
                                <Popup>
                                    <div className="text-right font-sans p-1 min-w-[150px]">
                                        <div className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                                            <User className="w-4 h-4 text-blue-600" />
                                            {tech.full_name || 'فني'}
                                        </div>
                                        <div className="text-xs text-slate-500 mb-2 space-y-1">
                                            {tech.phone && <div dir="ltr" className="flex items-center gap-1 justify-end">{tech.phone}</div>}
                                            {tech.last_seen_at && (
                                                <div>آخر ظهور: {new Date(tech.last_seen_at).toLocaleTimeString('ar-EG')}</div>
                                            )}
                                            {distance !== null && (
                                                <div className="font-bold text-blue-600 mt-1 pt-1 border-t border-slate-100">
                                                    يبعد {distance.toFixed(1)} كم
                                                </div>
                                            )}
                                        </div>
                                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${tech.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {tech.status === 'active' ? 'نشط' : 'موقوف'}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>

                            {/* Draw Line to Target if in Dispatch Mode */}
                            {targetLocation && (
                                <Polyline
                                    positions={[
                                        [tech.last_lat, tech.last_lng],
                                        [targetLocation.lat, targetLocation.lng]
                                    ]}
                                    pathOptions={{
                                        color: '#3b82f6',
                                        weight: 2,
                                        opacity: 0.6,
                                        dashArray: '5, 10'
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </MapContainer>

            {/* Overlay Info */}
            <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-slate-200 max-w-xs">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-blue-600" />
                    {targetLocation ? 'توجيه الفنيين' : 'خريطة الفنيين المباشرة'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                    {targetLocation
                        ? 'يعرض الخطوط والمسافات المقدرة لكل فني عن موقع العطل.'
                        : 'يتم تحديث موقع الفنيين تلقائياً عند استخدامهم للتطبيق.'
                    }
                </p>
                {targetLocation && (
                    <div className="mt-2 text-xs font-bold text-blue-600">
                        الهدف: {targetLocation.label}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TechnicianMap;
