import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSovereignSchema } from '../../hooks/useSovereignSchema';
import {
    Star,
    MessageSquare,
    CheckCircle2,
    XCircle,
    Loader2,
    AlertCircle,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface HandoverApprovalModalProps {
    ticketId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const HandoverApprovalModal: React.FC<HandoverApprovalModalProps> = ({
    ticketId,
    onClose,
    onSuccess
}) => {
    const { schema, loading: schemaLoading } = useSovereignSchema('handover_form_v1');
    const [rating, setRating] = useState<number>(0);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [hoveredRating, setHoveredRating] = useState<number>(0);

    // Conditional Validation: notes required if rating < 3
    const isNotesRequired = rating > 0 && rating < 3;
    const isActionDisabled = rating === 0 || (isNotesRequired && !notes.trim());

    const handleAction = async (isApproved: boolean) => {
        setLoading(true);
        try {
            const status = isApproved ? 'closed' : 'in_progress';
            const updates: any = {
                status,
                rating,
                handover_notes: notes,
                updated_at: new Date().toISOString()
            };

            if (isApproved) {
                updates.closed_at = new Date().toISOString();
            }

            const { error } = await (supabase
                .from('tickets') as any)
                .update(updates)
                .eq('id', ticketId);

            if (error) throw error;

            toast.success(isApproved ? 'تم اعتماد الإصلاح بنجاح' : 'تم رفض الاستلام وإعادة البلاغ للفني');
            onSuccess();
        } catch (error: any) {
            console.error('Handover Error:', error);
            toast.error('فشل في معالجة طلب الاستلام');
        } finally {
            setLoading(false);
        }
    };

    if (schemaLoading) {
        return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white/5 border border-white/10 backdrop-blur-2xl w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden relative rtl text-right" dir="rtl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>

                {/* Header */}
                <div className="p-8 border-b border-white/10 flex justify-between items-center relative z-10">
                    <div>
                        <h2 className="text-2xl font-black text-white">{schema?.title || 'مراجعة واعتماد الإصلاح'}</h2>
                        <p className="text-white/40 font-medium">خطوة التحقق السيادي من جودة العمل</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
                        <X className="w-6 h-6 text-white/40" />
                    </button>
                </div>

                <div className="p-10 space-y-10 relative z-10">
                    {/* Rating Section */}
                    <div className="space-y-4">
                        <label className="block font-black text-white text-xl">تقييم جودة الإصلاح</label>
                        <div className="flex gap-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none transition-transform active:scale-95"
                                >
                                    <Star
                                        className={`w-12 h-12 transition-all ${(hoveredRating || rating) >= star
                                            ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                                            : 'text-white/10'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Feedback Notes */}
                    <div className="space-y-4">
                        <label className="block font-black text-white text-xl flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-blue-400" />
                            ملاحظات الاستلام / أسباب الرفض
                            {isNotesRequired && <span className="text-rose-500 text-sm font-bold">(إلزامي للتقييم المنخفض)</span>}
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="اكتب ملاحظاتك للفني هنا..."
                            className={`w-full bg-slate-900/50 border rounded-2xl px-6 py-5 text-white font-bold focus:ring-4 focus:ring-blue-500/20 outline-none transition-all min-h-[120px] ${isNotesRequired && !notes.trim() ? 'border-rose-500/50' : 'border-white/10'
                                }`}
                        />
                        {isNotesRequired && !notes.trim() && (
                            <p className="text-rose-400 text-sm font-bold flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                يجب كتابة سبب الرفض أو الملاحظات للتقييم المنخفض
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-6 pt-4">
                        <button
                            onClick={() => handleAction(true)}
                            disabled={loading || isActionDisabled}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-900/20 transition-all flex items-center justify-center gap-3 text-xl"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                            اعتماد الاستلام
                        </button>
                        <button
                            onClick={() => handleAction(false)}
                            disabled={loading || isActionDisabled}
                            className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-30 text-white font-black py-5 rounded-2xl shadow-xl shadow-rose-900/20 transition-all flex items-center justify-center gap-3 text-xl"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <XCircle className="w-6 h-6" />}
                            رفض وإعادة العمل
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
