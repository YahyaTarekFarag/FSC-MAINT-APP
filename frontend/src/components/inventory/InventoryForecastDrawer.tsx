import { X, Calendar, ArrowRight, Package, TrendingUp, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InventoryForecastDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    part: any;
}

const InventoryForecastDrawer = ({ isOpen, onClose, part }: InventoryForecastDrawerProps) => {
    if (!part) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[200]"
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-xl bg-slate-900 border-l border-white/10 shadow-2xl z-[201] p-8 overflow-y-auto"
                    >
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter">تحليل استهلاك المخزون</h2>
                                <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Predictive Stock Analytics</p>
                            </div>
                            <button onClick={onClose} className="p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
                                <X className="w-5 h-5 text-white/40" />
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* Part Profile Card */}
                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[50px]" />
                                <div className="relative z-10 flex items-center gap-6">
                                    <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                                        <Package className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white">{part.part_name}</h3>
                                        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">SKU: {part.sku}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    <div className="bg-white/5 rounded-2xl p-4">
                                        <span className="text-[10px] text-white/20 font-black uppercase">المخزون الحالي</span>
                                        <p className="text-2xl font-black text-white mt-1">{part.current_stock}</p>
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4">
                                        <span className="text-[10px] text-white/20 font-black uppercase">التغطية المتوقعة</span>
                                        <p className={`text-2xl font-black mt-1 ${part.days_of_coverage < 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {part.days_of_coverage} يوم
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Consumption Forecast Timeline */}
                            <div>
                                <div className="flex items-center gap-2 mb-6 ml-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Projection Matrix (Next 30 Days)</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-emerald-500" />
                                            </div>
                                            <div>
                                                <h5 className="text-sm font-bold text-white">الطلب المكتشف</h5>
                                                <p className="text-[10px] text-white/20 uppercase tracking-tight">Based on Active Protocols</p>
                                            </div>
                                        </div>
                                        <span className="text-xl font-black text-white">{part.projected_30d_demand} وحدات</span>
                                    </div>

                                    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                                <AlertCircle className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div>
                                                <h5 className="text-sm font-bold text-white">الفائض / العجز</h5>
                                                <p className="text-[10px] text-white/20 uppercase tracking-tight">Projected End Balance</p>
                                            </div>
                                        </div>
                                        <span className={`text-xl font-black ${part.projected_surplus < 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                            {part.projected_surplus} وحدة
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] p-8">
                                <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">Neural Recommendation</h4>
                                <p className="text-sm text-white/60 leading-relaxed font-medium">
                                    {part.stock_status === 'critical'
                                        ? `يُوصى بإعادة طلب شحنة فورية بحد أدنى ${Math.abs(part.projected_surplus) + 10} وحدات لتجنب توقف الصيانة الوقائية.`
                                        : part.stock_status === 'warning'
                                            ? `مستويات المخزون كافية للأسبوعين القادمين فقط. يُقترح جدولة طلب توريد خلال 5 أيام عمل.`
                                            : 'مستويات المخزون صحية جداً. لا توجد إجراءات مطلوبة حالياً.'}
                                </p>
                                <button className="w-full mt-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-3">
                                    فتح طلب شراء <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default InventoryForecastDrawer;
