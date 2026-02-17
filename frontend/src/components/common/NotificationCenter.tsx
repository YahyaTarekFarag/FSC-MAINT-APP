import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Info, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

type Notification = {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    is_read: boolean;
    link: string | null;
    created_at: string;
};

const NotificationCenter = ({ userId }: { userId: string }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!userId) return;

        fetchNotifications();

        // Real-time subscription
        const subscription = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [userId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setNotifications(data as Notification[]);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    };

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length === 0) return;

        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', unreadIds);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'error': return <X className="w-5 h-5 text-red-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
                title="الإشعارات"
            >
                <Bell className="w-6 h-6 text-slate-600" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-3 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800">الإشعارات</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                                <Check className="w-3 h-3" />
                                قراءة الكل
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400">
                                <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">لا توجد إشعارات جديدة</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`p-4 hover:bg-slate-50 transition-colors flex gap-3 ${!notif.is_read ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <div className="mt-1 flex-shrink-0">
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className={`text-sm font-bold ${!notif.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                                                    {notif.title}
                                                </h4>
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap mr-2">
                                                    {new Date(notif.created_at).toLocaleDateString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                                {notif.message}
                                            </p>

                                            <div className="flex gap-3 mt-2 items-center">
                                                {notif.link && (
                                                    <button
                                                        onClick={() => {
                                                            setIsOpen(false);
                                                            markAsRead(notif.id);
                                                            navigate(notif.link!);
                                                        }}
                                                        className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline"
                                                    >
                                                        عرض التفاصيل
                                                        <ExternalLink className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {!notif.is_read && (
                                                    <button
                                                        onClick={() => markAsRead(notif.id)}
                                                        className="text-xs text-slate-400 hover:text-slate-600"
                                                    >
                                                        تحديد كمقروء
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationCenter;
