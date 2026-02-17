import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../../lib/supabase';
import { Loader2, User, Navigation } from 'lucide-react';
import L from 'leaflet';

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

const TechnicianMap = () => {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTechnicians = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, last_lat, last_lng, last_seen_at, status, phone')
                .eq('role', 'technician')
                .not('last_lat', 'is', null);

            if (error) {
                console.error('Error fetching technicians:', error);
            } else {
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
                if (updatedUser.role === 'technician' && updatedUser.last_lat) { // Warning: Filter row might not have role if not selected
                    // Ideally we should merge with existing state
                    setTechnicians(prev => {
                        const index = prev.findIndex(t => t.id === updatedUser.id);
                        if (index !== -1) {
                            const newList = [...prev];
                            newList[index] = { ...newList[index], ...updatedUser };
                            return newList;
                        } else {
                            // If new tech appears with location
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

    if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    const center = [30.0444, 31.2357]; // Cairo Default

    return (
        <div className="h-[calc(100vh-100px)] rounded-2xl overflow-hidden shadow-lg border border-slate-200 relative">
            <MapContainer center={center as any} zoom={6} scrollWheelZoom={true} className="h-full w-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {technicians.map(tech => (
                    tech.last_lat && tech.last_lng && (
                        <Marker key={tech.id} position={[tech.last_lat, tech.last_lng]}>
                            <Popup>
                                <div className="text-right font-sans p-1">
                                    <div className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                                        <User className="w-4 h-4 text-blue-600" />
                                        {tech.full_name || 'فني'}
                                    </div>
                                    <div className="text-xs text-slate-500 mb-2">
                                        {tech.phone && <div dir="ltr" className="mb-1">{tech.phone}</div>}
                                        {tech.last_seen_at && (
                                            <div>آخر ظهور: {new Date(tech.last_seen_at).toLocaleTimeString('ar-EG')}</div>
                                        )}
                                    </div>
                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${tech.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {tech.status === 'active' ? 'نشط' : 'موقوف'}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>

            {/* Overlay Info */}
            <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur p-4 rounded-xl shadow-lg border border-slate-200 max-w-xs">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-blue-600" />
                    خريطة الفنيين المباشرة
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                    يتم تحديث موقع الفنيين تلقائياً عند استخدامهم للتطبيق.
                    عدد المتصلين: <span className="font-bold text-blue-600">{technicians.length}</span>
                </p>
            </div>
        </div>
    );
};

export default TechnicianMap;
