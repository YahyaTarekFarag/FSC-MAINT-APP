import React from 'react';
import {
    Type,
    Hash,
    List,
    Camera,
    MapPin,
    AlignLeft,
    Loader2
} from 'lucide-react';
import { useGeoLocation } from '../../hooks/useGeoLocation';

interface DynamicFieldProps {
    field: {
        id: string;
        label: string;
        type: string;
        required?: boolean;
        placeholder?: string;
        options?: { label: string; value: unknown; parentId?: unknown }[];
        filterBy?: string;
        multiple?: boolean;
        accept?: string;
    };
    value: any;
    formData?: any;
    onChange: (value: any) => void;
    onUpload?: (file: File) => Promise<string>;
}

export const DynamicField: React.FC<DynamicFieldProps> = ({ field, value, formData, onChange, onUpload }) => {
    const { getCoordinates } = useGeoLocation();
    const [uploading, setUploading] = React.useState(false);

    const handleCoords = async () => {
        try {
            const coords = await getCoordinates();
            onChange({ lat: coords.latitude, lng: coords.longitude });
        } catch (err) {
            console.error('GPS Error:', err);
        }
    };

    const renderInput = () => {
        switch (field.type) {
            case 'text':
                return (
                    <div className="relative">
                        <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-5 pl-12 text-white text-lg md:text-xl font-bold focus:ring-4 focus:ring-blue-500/30 outline-none transition-all placeholder:text-white/20"
                            placeholder={field.placeholder}
                        />
                        <Type className="absolute left-4 top-5 w-6 h-6 text-white/40" />
                    </div>
                );
            case 'number':
                return (
                    <div className="relative">
                        <input
                            type="number"
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-5 pl-12 text-white text-lg md:text-xl font-bold focus:ring-4 focus:ring-blue-500/30 outline-none transition-all placeholder:text-white/20"
                            placeholder={field.placeholder || '0'}
                        />
                        <Hash className="absolute left-4 top-5 w-6 h-6 text-white/40" />
                    </div>
                );
            case 'textarea':
                return (
                    <div className="relative">
                        <textarea
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-5 pl-12 text-white text-lg md:text-xl font-bold focus:ring-4 focus:ring-blue-500/30 outline-none transition-all min-h-[150px] placeholder:text-white/20"
                            placeholder={field.placeholder}
                        />
                        <AlignLeft className="absolute left-4 top-5 w-6 h-6 text-white/40" />
                    </div>
                );
            case 'select':
                return (
                    <div className="relative">
                        <select
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-5 pl-12 text-white text-lg md:text-xl font-bold focus:ring-4 focus:ring-blue-500/30 outline-none transition-all appearance-none"
                        >
                            <option value="" className="text-slate-900">{field.placeholder || 'اختر...'}</option>
                            {(field.options || [])
                                .filter(opt => {
                                    if (!field.filterBy) return true;
                                    const parentVal = formData?.[field.filterBy];
                                    return opt.parentId === parentVal;
                                })
                                .map((opt) => (
                                    <option key={String(opt.value)} value={String(opt.value)} className="text-slate-900 font-bold">
                                        {opt.label}
                                    </option>
                                ))}
                        </select>
                        <List className="absolute left-4 top-5 w-6 h-6 text-white/40" />
                    </div>
                );
            case 'file':
                return (
                    <div className="space-y-3">
                        {!value ? (
                            <label className="flex flex-col items-center justify-center w-full h-32 bg-white/10 backdrop-blur-md border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:bg-white/20 transition-all">
                                {uploading ? (
                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                ) : (
                                    <>
                                        <Camera className="w-8 h-8 text-white/40 mb-2" />
                                        <span className="text-sm text-white/60 font-medium">اضغط لالتقاط أو رفع صورة</span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept={field.accept || 'image/*'}
                                    multiple={field.multiple}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file && onUpload) {
                                            setUploading(true);
                                            const url = await onUpload(file);
                                            onChange(url);
                                            setUploading(false);
                                        }
                                    }}
                                />
                            </label>
                        ) : (
                            <div className="relative rounded-xl overflow-hidden border border-white/20">
                                <img src={value} alt="Preview" className="h-32 w-full object-cover" />
                                <button
                                    onClick={() => onChange(null)}
                                    className="absolute top-2 right-2 bg-red-500/80 p-1 rounded-full text-white"
                                >
                                    <List className="w-4 h-4 rotate-45" />
                                </button>
                            </div>
                        )}
                    </div>
                );
            case 'coords':
                return (
                    <button
                        type="button"
                        onClick={handleCoords}
                        className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-4 text-white flex items-center justify-between group hover:bg-white/20 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <MapPin className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                            <div className="text-right">
                                <p className="font-bold text-sm">{field.label}</p>
                                <p className="text-xs text-white/60">
                                    {value ? `${value.lat.toFixed(4)}, ${value.lng.toFixed(4)}` : 'بانتظار تحديد الموقع...'}
                                </p>
                            </div>
                        </div>
                        {value && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                    </button>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-3">
            <label className="block text-lg md:text-xl font-black text-white leading-none mr-2">
                {field.label}
                {field.required && <span className="text-red-400 mr-1 text-xl">*</span>}
            </label>
            {renderInput()}
        </div>
    );
};
