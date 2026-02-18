import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateDistance } from '../../utils/helpers';
import {
    AlertTriangle,
    Info,
    Upload,
    X,
    Loader2,
    CheckCircle2,
    MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { uploadTicketImage } from '../../lib/storage';
import DynamicForm from '../../components/tickets/DynamicForm';
import type { Database } from '../../lib/supabase';
import { useFormConfig } from '../../hooks/useFormConfig';

// Leaflet Imports
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet Marker Icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

type Branch = Database['public']['Tables']['branches']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface NewTicketProps {
    userProfile: Profile | null;
}

const LocationMarker = ({ setLocation, setLocationError }: { setLocation: (loc: { lat: number; lng: number }) => void, setLocationError: (msg: string | null) => void }) => {
    const map = useMap();
    const [position, setPosition] = useState<L.LatLng | null>(null);

    useEffect(() => {
        map.locate().on("locationfound", function (e) {
            setPosition(e.latlng);
            map.flyTo(e.latlng, map.getZoom());
            setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
            setLocationError(null);
        }).on("locationerror", function (e) {
            console.error(e);
            setLocationError(e.message);
        });
    }, [map, setLocation, setLocationError]);

    return position === null ? null : (
        <Marker position={position}>
            <Popup>موقعك الحالي</Popup>
        </Marker>
    );
};

const NewTicket: React.FC<NewTicketProps> = ({ userProfile }) => {
    const navigate = useNavigate();
    const { shouldShow, getLabel, isRequired } = useFormConfig('new_ticket');

    const [loading, setLoading] = useState(false);
    const [fetchingBranches, setFetchingBranches] = useState(false);
    const [fetchingAssets, setFetchingAssets] = useState(false);
    const [fetchingCategories, setFetchingCategories] = useState(false);

    const [branches, setBranches] = useState<Branch[]>([]);
    const [assets, setAssets] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [mapReady, setMapReady] = useState(false);

    const [form, setForm] = useState({
        branch_id: '',
        asset_id: '',
        fault_category: '',
        priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
        description: ''
    });

    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [dynamicData, setDynamicData] = useState<Record<string, any>>({});
    const [formResponses, setFormResponses] = useState<Record<string, any>>({});
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Geofencing Logic
    const [distanceToBranch, setDistanceToBranch] = useState<number | null>(null);
    const [geofenceValid, setGeofenceValid] = useState(true); // Default true until checked
    const geofencingEnabled = userProfile?.role === 'technician'; // Example rule, or fetch from settings

    useEffect(() => {
        setTimeout(() => setMapReady(true), 500);
        fetchBranches();
        fetchCategories();
    }, []);

    useEffect(() => {
        if (userProfile?.branch_id && branches.length > 0) {
            setForm(prev => ({ ...prev, branch_id: userProfile.branch_id! }));
        }
    }, [userProfile, branches]);

    useEffect(() => {
        if (form.branch_id) {
            fetchAssets(form.branch_id);
            checkGeofence();
        } else {
            setAssets([]);
        }
    }, [form.branch_id, location]);

    const fetchBranches = async () => {
        setFetchingBranches(true);
        try {
            const { data } = await supabase.from('branches').select('*');
            if (data) setBranches(data);
        } catch (error) {
            console.error(error);
        } finally {
            setFetchingBranches(false);
        }
    };

    const fetchAssets = async (branchId: string) => {
        setFetchingAssets(true);
        try {
            const { data } = await supabase
                .from('maintenance_assets')
                .select('*')
                .eq('branch_id', branchId);
            if (data) setAssets(data);
        } catch (error) {
            console.error(error);
        } finally {
            setFetchingAssets(false);
        }
    };

    const fetchCategories = async () => {
        setFetchingCategories(true);
        try {
            const { data } = await supabase.from('fault_categories').select('*');
            if (data) setCategories(data);
        } catch (error) {
            console.error(error);
        } finally {
            setFetchingCategories(false);
        }
    };

    const checkGeofence = () => {
        if (!geofencingEnabled || !location || !form.branch_id) return;

        const branch = branches.find(b => b.id === form.branch_id);
        if (branch && branch.location_lat && branch.location_lng) {
            const dist = calculateDistance(
                location.lat,
                location.lng,
                Number(branch.location_lat),
                Number(branch.location_lng)
            );
            setDistanceToBranch(Math.round(dist));
            setGeofenceValid(dist <= 200); // 200 meters allowed
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 5 * 1024 * 1024) {
                toast.error('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
                return;
            }
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
    };

    const removeFile = () => {
        setFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isRequired('branch_id', true) && !form.branch_id) { toast.error('يرجى اختيار الفرع'); return; }
        if (isRequired('fault_category', true) && !form.fault_category) { toast.error('يرجى اختيار نوع العطل'); return; }
        if (isRequired('description', true) && !form.description) { toast.error('يرجى وصف العطل'); return; }

        if (geofencingEnabled && !geofenceValid) {
            toast.error('لا يمكن إرسال البلاغ لأنك خارج نطاق الفرع');
            return;
        }

        setLoading(true);
        try {
            let imageUrl = null;
            if (file) {
                imageUrl = await uploadTicketImage(file);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: ticket, error } = await (supabase.from('tickets') as any).insert({
                branch_id: form.branch_id,
                asset_id: form.asset_id || null,
                category: form.fault_category,
                priority: form.priority,
                description: form.description,
                status: 'open',
                created_by: userProfile?.id,
                location_lat: location?.lat,
                location_lng: location?.lng,
                images_url: imageUrl ? [imageUrl] : [],
                form_data: dynamicData, // Store legacy dynamic form data here
                source: 'web'
            })
                .select()
                .single();

            if (error) throw error;
            if (!ticket) throw new Error('فشل إنشاء التذكرة');

            // 5. Save Form Responses (Phase 61)
            if (Object.keys(formResponses).length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error: formError } = await (supabase.from('form_responses') as any)
                    .insert({
                        ticket_id: ticket.id,
                        form_key: 'new_ticket',
                        responses: formResponses,
                        submitted_by: userProfile?.id
                    });

                if (formError) throw formError;
            }

            toast.success('تم إرسال البلاغ بنجاح');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error submitting ticket:', error);
            toast.error('حدث خطأ أثناء إرسال البلاغ');
        } finally {
            setLoading(false);
        }
    };

    const priorities = [
        { value: 'low', label: 'منخفضة', color: 'slate' },
        { value: 'medium', label: 'متوسطة', color: 'blue' },
        { value: 'high', label: 'عالية', color: 'orange' },
        { value: 'urgent', label: 'طارئة', color: 'red' }
    ];

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
                <div className="bg-amber-100 p-3 rounded-2xl">
                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">إبلاغ عن عطل جديد</h1>
                    <p className="text-slate-500">يرجى ملء البيانات التالية بدقة لضمان سرعة الاستجابة</p>
                </div>
            </div>

            {/* Map Section - Always visible for now as it's core logic, or could be made dynamic too */}
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm mb-6 relative z-0">
                {/* ... existing map code ... */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-500" />
                        تأكيد الموقع الجغرافي
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${location ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {location ? (
                            <>
                                <CheckCircle2 className="w-3 h-3" />
                                تم التحديد
                            </>
                        ) : (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                جاري التحديد...
                            </>
                        )}
                    </div>
                </div>

                <div className="h-64 w-full relative bg-slate-100">
                    {mapReady && (
                        <MapContainer
                            center={[24.7136, 46.6753]} // Riyadh Default
                            zoom={13}
                            scrollWheelZoom={false}
                            className="h-full w-full z-0"
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <LocationMarker setLocation={setLocation} setLocationError={setLocationError} />
                        </MapContainer>
                    )}

                    {locationError && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 text-center">
                            <div>
                                <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
                                <p className="text-red-600 font-bold">{locationError}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                                >
                                    حاول مرة أخرى
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Branch Selection */}
                {shouldShow('branch_id') && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <label className="flex items-center gap-2 font-bold text-slate-700">
                            <Building2 className="w-5 h-5 text-blue-500" />
                            {getLabel('branch_id', 'اختيار الفرع')}
                            {isRequired('branch_id', true) && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                            <select
                                required={isRequired('branch_id', true)}
                                value={form.branch_id}
                                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                                disabled={fetchingBranches || (userProfile?.role === 'manager' && !!userProfile.branch_id)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50 appearance-none disabled:bg-slate-100"
                            >
                                <option value="">
                                    {fetchingBranches ? 'جاري تحميل الفروع...' : 'اختر الفرع...'}
                                </option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name_ar}</option>
                                ))}
                            </select>
                            {fetchingBranches && (
                                <div className="absolute left-4 top-3.5">
                                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                </div>
                            )}
                        </div>
                        {userProfile?.role === 'manager' && userProfile.branch_id && (
                            <p className="text-xs text-blue-600/70 font-medium">تم تحديد فرعك تلقائياً</p>
                        )}
                        {/* Geofencing Status Display Logic kept here */}
                        {geofencingEnabled && distanceToBranch !== null && (
                            <div className={`mt-4 p-3 rounded-xl border flex items-start gap-3 ${geofenceValid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                {geofenceValid ? (
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                ) : (
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                )}
                                <div>
                                    <p className="font-bold text-sm">
                                        {geofenceValid ? 'أنت داخل نطاق الفرع' : 'أنت خارج نطاق الفرع المسموح'}
                                    </p>
                                    <p className="text-xs opacity-80 mt-1">
                                        المسافة الحالية: {distanceToBranch} متر (الحد الأقصى: 200 متر)
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Asset Selection */}
                {shouldShow('asset_id') && form.branch_id && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <label className="flex items-center gap-2 font-bold text-slate-700">
                            <Box className="w-5 h-5 text-blue-500" />
                            {getLabel('asset_id', 'الأصل المرتبط (اختياري)')}
                            {isRequired('asset_id', false) && <span className="text-red-500">*</span>}
                        </label>
                        <div className="relative">
                            <select
                                required={isRequired('asset_id', false)}
                                value={form.asset_id}
                                onChange={(e) => setForm({ ...form, asset_id: e.target.value })}
                                disabled={fetchingAssets}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:opacity-50 appearance-none disabled:bg-slate-100"
                            >
                                <option value="">
                                    {fetchingAssets ? 'جاري تحميل الأصول...' : 'اختر الأصل (إذا وجد)...'}
                                </option>
                                {assets.map(asset => (
                                    <option key={asset.id} value={asset.id}>{asset.name}</option>
                                ))}
                            </select>
                            {fetchingAssets && (
                                <div className="absolute left-4 top-3.5">
                                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Category & Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category */}
                    {shouldShow('fault_category') ? (
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                            <label className="flex items-center gap-2 font-bold text-slate-700">
                                <Info className="w-5 h-5 text-blue-500" />
                                {getLabel('fault_category', 'تصنيف العطل')}
                                {isRequired('fault_category', true) && <span className="text-red-500">*</span>}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {fetchingCategories ? (
                                    <div className="col-span-2 text-center py-4 text-slate-400">
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                        جاري تحميل التصنيفات...
                                    </div>
                                ) : categories.length === 0 ? (
                                    <div className="col-span-2 text-center py-4 text-slate-400">
                                        لا توجد تصنيفات متاحة حالياً
                                    </div>
                                ) : categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                            setForm({ ...form, fault_category: cat.name_ar });
                                            setSelectedCategoryId(cat.id);
                                        }}
                                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border break-words
                                            ${selectedCategoryId === cat.id
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-300'}
                                        `}
                                    >
                                        {cat.name_ar}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {/* Priority */}
                    {shouldShow('priority') ? (
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                            <label className="flex items-center gap-2 font-bold text-slate-700">
                                <AlertTriangle className="w-5 h-5 text-blue-500" />
                                {getLabel('priority', 'درجة الأولوية')}
                                {isRequired('priority', true) && <span className="text-red-500">*</span>}
                            </label>
                            <div className="space-y-2">
                                {priorities.map(p => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, priority: p.value as 'low' | 'medium' | 'high' | 'urgent' })}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all
                                            ${form.priority === p.value
                                                ? `bg-${p.color}-50 border-${p.color}-500 text-${p.color}-700 ring-1 ring-${p.color}-500`
                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}
                                        `}
                                    >
                                        <span className="font-bold">{p.label}</span>
                                        {form.priority === p.value && <CheckCircle2 className="w-5 h-5" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Description */}
                {shouldShow('description') && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <label className="font-bold text-slate-700">
                            {getLabel('description', 'وصف المشكلة بالتفصيل')}
                            {isRequired('description', true) && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            required={isRequired('description', true)}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all min-h-[120px]"
                            placeholder="اشرح العطل بوضوح لمساعدة الفني..."
                        />
                    </div>
                )}

                {/* Phase 61: Dynamic Fields (New Ticket Form) */}
                <DynamicForm
                    formKey="new_ticket"
                    onChange={setFormResponses}
                />

                {/* Dynamic Form Questions (Specific to Category) */}
                {selectedCategoryId && (
                    <DynamicForm
                        categoryId={selectedCategoryId}
                        onChange={setDynamicData}
                    />
                )}

                {/* Image Upload */}
                {shouldShow('photos') && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <label className="font-bold text-slate-700 underline decoration-blue-100 underline-offset-4">
                            {getLabel('photos', 'إرفاق صورة للعطل')}
                            {isRequired('photos', false) && <span className="text-red-500">*</span>}
                        </label>

                        {!previewUrl ? (
                            <div className="relative group cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    required={isRequired('photos', false)}
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 z-10 cursor-pointer"
                                />
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 group-hover:border-blue-400 group-hover:bg-blue-50/50 transition-all">
                                    <div className="bg-slate-100 p-4 rounded-full group-hover:bg-blue-100 group-hover:scale-110 transition-all">
                                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-600" />
                                    </div>
                                    <p className="text-slate-500 font-medium">اضغط هنا أو قم بسحب الصورة</p>
                                    <p className="text-xs text-slate-400">PNG, JPG حتى 5 ميجابايت</p>
                                </div>
                            </div>
                        ) : (
                            <div className="relative rounded-2xl overflow-hidden group">
                                <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        className="bg-red-500 p-2 rounded-full text-white hover:scale-110 transition-transform"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                <div className="pt-4 flex gap-4">
                    <button
                        type="submit"
                        disabled={loading || !location || (geofencingEnabled && !geofenceValid)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-200 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-3 text-lg"
                    >
                        {loading && <Loader2 className="w-6 h-6 animate-spin" />}
                        {location ? (geofencingEnabled && !geofenceValid ? 'خارج النطاق الجغرافي' : 'إرسال البلاغ') : 'بانتظار تحديد الموقع...'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="px-8 bg-white text-slate-500 border border-slate-200 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewTicket;
