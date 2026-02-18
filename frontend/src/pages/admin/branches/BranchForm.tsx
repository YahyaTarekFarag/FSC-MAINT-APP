import { useEffect, useState } from 'react';
import {
    X,
    Loader2,
    Building2,
    MapPin,
    ExternalLink,
    ChevronDown,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/supabase';

type Branch = Database['public']['Tables']['branches']['Row'];
type Brand = Database['public']['Tables']['brands']['Row'];
type Area = Database['public']['Tables']['areas']['Row'];
type Sector = Database['public']['Tables']['sectors']['Row'];

interface BranchFormProps {
    branch?: Branch | null;
    onClose: () => void;
    onSuccess: () => void;
}

const BranchForm: React.FC<BranchFormProps> = ({ branch, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [brands, setBrands] = useState<Brand[]>([]);
    const [sectors, setSectors] = useState<Sector[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);

    const [formData, setFormData] = useState({
        name_ar: branch?.name_ar || '',
        brand_id: branch?.brand_id || '',
        area_id: branch?.area_id || '',
        google_map_link: branch?.google_map_link || '',
        location_lat: branch?.location_lat || 30.0444, // Default to Cairo
        location_lng: branch?.location_lng || 31.2357,
        is_active: true // Assuming active by default
    });

    const LocationMarker = () => {
        useMapEvents({
            click(e) {
                setFormData(prev => ({
                    ...prev,
                    location_lat: e.latlng.lat,
                    location_lng: e.latlng.lng,
                    google_map_link: `https://www.google.com/maps?q=${e.latlng.lat},${e.latlng.lng}`
                }));
            },
        });

        return (
            <Marker position={[formData.location_lat, formData.location_lng]} />
        );
    };

    useEffect(() => {
        fetchMetadata();
    }, []);

    const fetchMetadata = async () => {
        try {
            const [brandsRes, sectorsRes, areasRes] = await Promise.all([
                supabase.from('brands').select('*').order('name_ar'),
                supabase.from('sectors').select('*').order('name_ar'),
                supabase.from('areas').select('*').order('name_ar')
            ]);

            if (brandsRes.error) throw brandsRes.error;
            if (sectorsRes.error) throw sectorsRes.error;
            if (areasRes.error) throw areasRes.error;

            setBrands(brandsRes.data || []);
            setSectors(sectorsRes.data || []);
            setAreas(areasRes.data || []);
        } catch (err) {
            console.error('Error fetching metadata (BranchForm):', err);
            toast.error('خطأ في تحميل بيانات الإعداد (العلامات، القطاعات، المناطق)');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name_ar || !formData.brand_id || !formData.area_id) return;

        setLoading(true);
        try {
            if (branch) {
                // Update
                const { error } = await supabase.from('branches')
                    .update({
                        name_ar: formData.name_ar,
                        brand_id: formData.brand_id,
                        area_id: formData.area_id,
                        google_map_link: formData.google_map_link,
                        location_lat: formData.location_lat,
                        location_lng: formData.location_lng,
                        is_active: formData.is_active
                    } as any)
                    .eq('id', branch.id);
                if (error) throw error;
                toast.success('تمت تحديث بيانات الفرع بنجاح ✅');
            } else {
                // Insert
                const { error } = await supabase.from('branches')
                    .insert({
                        name_ar: formData.name_ar,
                        brand_id: formData.brand_id,
                        area_id: formData.area_id,
                        google_map_link: formData.google_map_link,
                        location_lat: formData.location_lat,
                        location_lng: formData.location_lng,
                        is_active: formData.is_active
                    } as any);
                if (error) throw error;
                toast.success('تمت إضافة الفرع الجديد بنجاح ✅');
            }
            onSuccess();
        } catch (err: any) {
            console.error('Error saving branch:', err);
            toast.error('خطأ في حفظ بيانات الفرع: ' + (err.message || 'خطأ غير معروف'));
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-xl">
                        <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    {branch ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}
                </h2>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Ar */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 block">اسم الفرع (باللغة العربية)</label>
                    <input
                        type="text"
                        required
                        value={formData.name_ar}
                        onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                        placeholder="مثال: فرع التجمع الخامس"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Brand */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 block">العلامة التجارية</label>
                        <div className="relative">
                            <select
                                required
                                value={formData.brand_id}
                                onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium appearance-none"
                            >
                                <option value="">اختر البراند...</option>
                                {brands.map(brand => (
                                    <option key={brand.id} value={brand.id}>{brand.name_ar}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Area */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 block">المنطقة الجغرافية</label>
                        <div className="relative">
                            <select
                                required
                                value={formData.area_id}
                                onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium appearance-none"
                            >
                                <option value="">اختر المنطقة...</option>
                                {sectors.map(sector => (
                                    <optgroup key={sector.id} label={sector.name_ar}>
                                        {areas.filter(a => a.sector_id === sector.id).map(area => (
                                            <option key={area.id} value={area.id}>{area.name_ar}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Google Map Link */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 block flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-red-500" />
                        رابط خرائط جوجل (إختياري)
                    </label>
                    <div className="relative">
                        <input
                            type="url"
                            value={formData.google_map_link}
                            onChange={(e) => setFormData({ ...formData, google_map_link: e.target.value })}
                            placeholder="https://maps.google.com/..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium pr-4 pl-12"
                        />
                        {formData.google_map_link && (
                            <a
                                href={formData.google_map_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}
                    </div>
                </div>

                {/* Map Picker */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 block">تحديد الموقع على الخريطة</label>
                    <div className="h-64 rounded-2xl overflow-hidden border border-slate-200 relative z-0">
                        <MapContainer
                            center={[formData.location_lat, formData.location_lng]}
                            zoom={13}
                            className="h-full w-full"
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap contributors'
                            />
                            <LocationMarker />
                        </MapContainer>
                    </div>
                    <p className="text-xs text-slate-400">اضغط على الخريطة لتحديث الموقع ورابط جوجل تلقائياً</p>
                </div>

                {/* Status Toggle (Simple checkbox for UI simplicity) */}
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="text-sm font-bold text-slate-700 cursor-pointer">
                        الفرع مفعل ويظهر في قائمة البلاغات
                    </label>
                </div>

                <div className="flex items-center gap-4 pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                        {branch ? 'حفظ التعديلات' : 'إضافة فرع'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                    >
                        إلغاء
                    </button>
                </div>
            </form>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 leading-relaxed font-bold">
                    تأكد من صحة رابط خرائط جوجل ليتمكن الفنيون من الوصول للمكان بسهولة عبر تطبيق الموبايل.
                </p>
            </div>
        </div>
    );
};

export default BranchForm;
