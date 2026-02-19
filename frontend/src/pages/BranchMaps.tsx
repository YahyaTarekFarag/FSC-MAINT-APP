import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import {
    Loader2,
    MapPin,
    Navigation,
    Search,
    Compass,
    Building2,
    Activity,
    AlertCircle
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

// Brand Color Mapping
const BRAND_COLORS: Record<string, string> = {
    'B-Laban': 'blue-500',
    'Konafa & Basbousa': 'orange-500',
    'Wahmi': 'red-500',
    'Om Shaltat': 'emerald-500',
    'default': 'slate-400'
};

const BRAND_ARABIC: Record<string, string> = {
    'B-Laban': 'ب لبن',
    'Konafa & Basbousa': 'كنافة وبسبوسة',
    'Wahmi': 'وهمي برجر',
    'Om Shaltat': 'عم شلتت'
};

// Custom Sovereign Marker
const createSovereignIcon = (brandName: string, isSelected: boolean) => {
    const color = BRAND_COLORS[brandName] || BRAND_COLORS.default;
    const tailwindColor = isSelected ? 'emerald-500' : color;

    // We need to map Tailwind colors to HEX for the SVG if needed, but here we use classes
    // Note: Leaflet divIcon doesn't easily support Tailwind out of the box unless handled via CSS strings
    // We'll use CSS variables or direct styling
    const colorMap: Record<string, string> = {
        'blue-500': '#3b82f6',
        'orange-500': '#f59e0b',
        'red-500': '#ef4444',
        'emerald-500': '#10b981',
        'slate-400': '#94a3b8'
    };

    const hexColor = colorMap[tailwindColor] || colorMap['blue-500'];

    return L.divIcon({
        html: `<div class="relative flex items-center justify-center">
                 <div class="absolute w-12 h-12 bg-white/20 rounded-full animate-ping" style="background-color: ${hexColor}33"></div>
                 <div class="relative w-8 h-8 bg-white border-4 rounded-full shadow-2xl flex items-center justify-center transition-all ${isSelected ? 'scale-125' : ''}" style="border-color: ${hexColor}">
                   <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${hexColor}"></div>
                 </div>
               </div>`,
        className: 'custom-div-icon',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
    });
};

interface Branch {
    id: string;
    name_ar: string;
    city: string;
    phone: string | null;
    manager_name: string | null;
    location_lat: number | null;
    location_lng: number | null;
    brand: {
        name_ar: string;
    } | null;
}

interface RiskData {
    branch_id: string;
    aggregate_risk_score: number;
    open_tickets: number;
    projected_failures: number;
}

const MapController = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

const BranchMaps: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [riskMap, setRiskMap] = useState<Record<string, RiskData>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

    const fetchBranches = async () => {
        try {
            const [branchesRes, riskRes] = await Promise.all([
                supabase
                    .from('branches')
                    .select(`
                        id, 
                        name_ar, 
                        location_lat, 
                        location_lng, 
                        brand:brands(name_ar)
                    `)
                    .eq('is_active', true),
                supabase.from('v_operational_risk_heatmap').select('*')
            ]);

            if (branchesRes.error) throw branchesRes.error;
            setBranches(branchesRes.data || [] as any);

            if (riskRes.data) {
                const rMap = Object.fromEntries(riskRes.data.map((r: RiskData) => [r.branch_id, r]));
                setRiskMap(rMap);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            toast.error('خطأ في تحميل بيانات الفروع أو المخاطر');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const filteredBranches = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return branches.filter(b =>
            b.name_ar.toLowerCase().includes(term) ||
            b.brand?.name_ar.toLowerCase().includes(term)
        ).map(b => ({
            ...b,
            coords: (b.location_lat && b.location_lng)
                ? [b.location_lat, b.location_lng] as [number, number]
                : [30.0444, 31.2357] as [number, number] // Cairo Fallback
        }));
    }, [branches, searchTerm]);

    const activeCenter = useMemo(() => {
        if (selectedBranch) {
            return (selectedBranch.location_lat && selectedBranch.location_lng)
                ? [selectedBranch.location_lat, selectedBranch.location_lng] as [number, number]
                : [30.0444, 31.2357] as [number, number];
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
        <div className="h-[calc(100vh-12rem)] flex flex-col gap-6 animate-in fade-in duration-700 rtl" dir="rtl">
            {/* Header / Search */}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-[3rem] flex flex-col lg:flex-row gap-6 items-center justify-between shadow-2xl">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
                        <Compass className="w-10 h-10 text-blue-500" />
                        رادار الفروع المتكامل
                    </h1>
                    <p className="text-white/40 font-black mt-1 uppercase tracking-widest text-[10px]">Strategic Asset Deployment Map</p>
                </div>

                <div className="relative w-full lg:w-[32rem]">
                    <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-white/20" />
                    <input
                        type="text"
                        placeholder="ابحث عن فرع أو علامة تجارية (ب لبن، كنافة، وهمي...)"
                        className="w-full bg-white/5 border border-white/10 rounded-3xl py-6 pr-16 pl-6 text-white placeholder:text-white/20 font-bold focus:border-blue-500 transition-all outline-none backdrop-blur-md shadow-inner"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 rounded-[4rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative">
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
                            icon={createSovereignIcon(branch.brand?.name_ar || '', branch.id === selectedBranch?.id)}
                            eventHandlers={{
                                click: () => setSelectedBranch(branch)
                            }}
                        >
                            <Popup className="sovereign-popup">
                                <div className="p-6 space-y-6 text-right" dir="rtl">
                                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                        <h3 className="text-2xl font-black text-slate-900 leading-tight">{branch.name_ar}</h3>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase text-white ${BRAND_COLORS[branch.brand?.name_ar || '']?.replace('500', '600') || 'bg-slate-600'
                                            } bg-${BRAND_COLORS[branch.brand?.name_ar || '']?.split('-')[0]}-600`}>
                                            {branch.brand?.name_ar}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {riskMap[branch.id]?.aggregate_risk_score > 5 && (
                                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between mb-2 animate-pulse">
                                                <div className="flex items-center gap-3">
                                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                                    <span className="text-red-700 font-black text-xs uppercase tracking-tighter">High Risk Area</span>
                                                </div>
                                                <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[9px] font-black">{riskMap[branch.id].aggregate_risk_score}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-4 text-sm font-bold text-slate-600">
                                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                                                <Building2 className="w-4 h-4 text-blue-500" />
                                            </div>
                                            <span>{BRAND_ARABIC[branch.brand?.name_ar || ''] || 'فرع سيادي'}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm font-bold text-slate-600">
                                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <span className="truncate max-w-[180px]">جاري المتابعة الجغرافية...</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${branch.coords[0]},${branch.coords[1]}`, '_blank')}
                                        className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:translate-y-[-4px] active:scale-95 transition-all shadow-2xl shadow-slate-900/30 group"
                                    >
                                        <Navigation className="w-5 h-5 text-blue-400 group-hover:animate-bounce" />
                                        توجيه القمر الصناعي
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* Glass Sidebar Overlay */}
                <div className="absolute top-8 left-8 z-20 w-80 max-h-[calc(100%-4rem)] bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 overflow-y-auto hidden lg:block custom-scrollbar shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-white font-black text-xl flex items-center gap-3">
                                <Activity className="w-5 h-5 text-emerald-400" />
                                الانتشار الحي
                            </h3>
                            <p className="text-white/30 text-[9px] font-black uppercase tracking-widest mt-1">{filteredBranches.length} ACTIVE CLUSTERS</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {filteredBranches.map(branch => (
                            <button
                                key={branch.id}
                                onClick={() => setSelectedBranch(branch)}
                                className={`w-full text-right p-5 rounded-[2rem] transition-all border group relative overflow-hidden ${selectedBranch?.id === branch.id
                                    ? 'bg-white text-slate-900 border-white shadow-2xl shadow-white/10'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-white'
                                    }`}
                            >
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-2 h-2 rounded-full bg-${BRAND_COLORS[branch.brand?.name_ar || '']?.split('-')[0]}-500 shadow-[0_0_10px_rgba(0,0,0,0.5)]`}></div>
                                        <span className={`text-[9px] font-black uppercase tracking-tighter ${selectedBranch?.id === branch.id ? 'text-slate-500' : 'text-white/40'}`}>
                                            {branch.brand?.name_ar}
                                        </span>
                                    </div>
                                    <p className="font-black text-sm leading-tight">{branch.name_ar}</p>
                                </div>
                                {selectedBranch?.id === branch.id && (
                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .sovereign-popup .leaflet-popup-content-wrapper {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(20px);
                    border-radius: 3rem;
                    padding: 0;
                    overflow: hidden;
                    box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.7);
                }
                .sovereign-popup .leaflet-popup-content {
                    margin: 0;
                    width: 320px !important;
                }
                .sovereign-popup .leaflet-popup-tip {
                    background: white;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 0;
                }
                .leaflet-container {
                    background: #0f172a !important;
                }
            `}</style>
        </div>
    );
};

export default BranchMaps;
