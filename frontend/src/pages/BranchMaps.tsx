import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import {
    Loader2,
    MapPin,
    Phone,
    User,
    Navigation,
    Search,
    Compass
} from 'lucide-react';
import toast from 'react-hot-toast';

// Fix for default marker icons in Leaflet + React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Sovereign Marker
const createSovereignIcon = (color: string = '#3b82f6') => L.divIcon({
    html: `<div class="relative flex items-center justify-center">
             <div class="absolute w-12 h-12 bg-${color}/20 rounded-full animate-ping"></div>
             <div class="relative w-8 h-8 bg-white border-4 border-${color} rounded-full shadow-2xl flex items-center justify-center">
               <div class="w-2 h-2 bg-${color} rounded-full"></div>
             </div>
           </div>`,
    className: 'custom-div-icon',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
});

interface Branch {
    id: string;
    name_ar: string;
    city: string;
    phone: string | null;
    manager_name: string | null;
    location_lat: number | null;
    location_lng: number | null;
}

// Helper to assign mock coordinates based on city for testing
const getFallbackCoords = (city: string): [number, number] => {
    const cityMap: Record<string, [number, number]> = {
        'القاهرة': [30.0444, 31.2357],
        'الإسكندرية': [31.2001, 29.9187],
        'طنطا': [30.7865, 30.9997],
        'المنصورة': [31.0409, 31.3785],
        'أسيوط': [27.1783, 31.1859],
        'الزقازيق': [30.5877, 31.502],
        'المنيا': [28.0991, 30.75],
        'دمنهور': [31.0379, 30.4697],
        'بنها': [30.4591, 31.1786],
        'الإسماعيلية': [30.5965, 32.2715],
    };

    return cityMap[city] || [30.0444, 31.2357]; // Default to Cairo
};

const MapController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

const BranchMaps: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

    const fetchBranches = async () => {
        try {
            const { data, error } = await supabase
                .from('branches')
                .select('id, name_ar, city, phone, manager_name, location_lat, location_lng')
                .eq('is_active', true);

            if (error) throw error;
            setBranches(data || []);
        } catch (err) {
            console.error('Error fetching branches:', err);
            toast.error('خطأ في تحميل بيانات الفروع');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const filteredBranches = useMemo(() => {
        return branches.filter(b =>
            b.name_ar.includes(searchTerm) ||
            b.city.includes(searchTerm)
        ).map(b => ({
            ...b,
            coords: (b.location_lat && b.location_lng)
                ? [b.location_lat, b.location_lng] as [number, number]
                : getFallbackCoords(b.city)
        }));
    }, [branches, searchTerm]);

    const activeCenter = useMemo(() => {
        if (selectedBranch) {
            return (selectedBranch.location_lat && selectedBranch.location_lng)
                ? [selectedBranch.location_lat, selectedBranch.location_lng] as [number, number]
                : getFallbackCoords(selectedBranch.city);
        }
        return [30.0444, 31.2357] as [number, number]; // Default center (Egypt)
    }, [selectedBranch]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-6">
            <Loader2 className="w-16 h-16 animate-spin text-blue-500" />
            <p className="text-white text-2xl font-black">جاري استدعاء الخارطة السيادية...</p>
        </div>
    );

    return (
        <div className="h-[calc(100vh-12rem)] flex flex-col gap-6 animate-in fade-in duration-700">
            {/* Header / Search */}
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                        <Compass className="w-10 h-10 text-blue-500" />
                        رادار الفروع
                    </h1>
                    <p className="text-white/40 font-medium mt-1">المتابعة الجغرافية والتحكم في الانتشار</p>
                </div>

                <div className="relative w-full lg:w-96">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                    <input
                        type="text"
                        placeholder="ابحث عن فرع أو مدينة..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white placeholder:text-white/20 font-bold focus:border-blue-500 transition-all outline-none backdrop-blur-md"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl relative">
                <MapContainer
                    center={[30.0444, 31.2357]}
                    zoom={7}
                    className="h-full w-full z-10"
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    />

                    <MapController center={activeCenter} />

                    {filteredBranches.map(branch => (
                        <Marker
                            key={branch.id}
                            position={branch.coords}
                            icon={createSovereignIcon(branch.id === selectedBranch?.id ? 'emerald-500' : 'blue-500')}
                            eventHandlers={{
                                click: () => setSelectedBranch(branch)
                            }}
                        >
                            <Popup className="sovereign-popup">
                                <div className="p-4 space-y-4 text-right" dir="rtl">
                                    <h3 className="text-xl font-black text-slate-900 border-b pb-2">{branch.name_ar}</h3>

                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <MapPin className="w-4 h-4 text-blue-500" />
                                            <span>{branch.city}</span>
                                        </div>
                                        {branch.manager_name && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <User className="w-4 h-4 text-blue-500" />
                                                <span>{branch.manager_name}</span>
                                            </div>
                                        )}
                                        {branch.phone && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Phone className="w-4 h-4 text-blue-500" />
                                                <a href={`tel:${branch.phone}`} className="hover:text-blue-500 transition-colors">{branch.phone}</a>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${branch.coords[0]},${branch.coords[1]}`, '_blank')}
                                        className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:translate-y-[-2px] active:scale-95 transition-all shadow-xl shadow-slate-900/20"
                                    >
                                        <Navigation className="w-5 h-5 text-blue-400" />
                                        بدء التوجيه الذكي (GPS)
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Glass Sidebar Overlay */}
                <div className="absolute top-4 left-4 z-20 w-80 max-h-[calc(100%-2rem)] bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 overflow-y-auto hidden lg:block custom-scrollbar">
                    <h3 className="text-white font-black mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-500" />
                        قائمة المواقع ({filteredBranches.length})
                    </h3>
                    <div className="space-y-3">
                        {filteredBranches.map(branch => (
                            <button
                                key={branch.id}
                                onClick={() => setSelectedBranch(branch)}
                                className={`w-full text-right p-4 rounded-2xl transition-all border ${selectedBranch?.id === branch.id
                                    ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <p className="text-white font-black text-sm">{branch.name_ar}</p>
                                <p className="text-white/40 text-xs mt-1">{branch.city}</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .sovereign-popup .leaflet-popup-content-wrapper {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 2.5rem;
                    padding: 0;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                .sovereign-popup .leaflet-popup-content {
                    margin: 0;
                    width: 280px !important;
                }
                .sovereign-popup .leaflet-popup-tip {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};

export default BranchMaps;
