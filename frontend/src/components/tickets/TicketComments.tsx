import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Send,
    MessageSquare,
    Clock,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/supabase';

type Comment = Database['public']['Tables']['ticket_comments']['Row'] & {
    profiles: {
        full_name: string | null;
        role: string | null;
    } | null;
};

interface TicketCommentsProps {
    ticketId: string;
}

const TicketComments: React.FC<TicketCommentsProps> = ({ ticketId }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchComments = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('ticket_comments')
                .select('*, profiles(full_name, role)')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setComments((data as unknown) as Comment[]);
        } catch (err) {
            console.error('Error fetching comments:', err);
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || sending) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const optimisticId = Math.random();
        const optimisticComment: Comment = {
            id: optimisticId,
            ticket_id: ticketId,
            user_id: user.id,
            content: newComment.trim(),
            created_at: new Date().toISOString(),
            profiles: {
                full_name: 'أنت',
                role: 'user'
            }
        };

        // Optimistic Update
        setComments(prev => [...prev, optimisticComment]);
        setNewComment('');
        setSending(true);

        try {
            const { error } = await (supabase
                .from('ticket_comments') as any)
                .insert({
                    ticket_id: ticketId,
                    user_id: user.id,
                    content: optimisticComment.content
                });

            if (error) throw error;

            // Refresh to get actual IDs
            await fetchComments();
        } catch (err) {
            console.error('Error sending comment:', err);
            // Remove the optimistic comment if it failed
            setComments(prev => prev.filter(c => c.id !== optimisticId));
            alert('فشل إرسال التعليق، يرجى المحاولة مرة أخرى');
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'U';
        return name.charAt(0).toUpperCase();
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[500px]">
            {/* Header */}
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    التعليقات والنشاط
                </div>
                <span className="bg-slate-50 text-slate-500 text-xs px-3 py-1 rounded-full font-bold">
                    {comments.length} تعليق
                </span>
            </div>

            {/* Activity Feed */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2 opacity-50">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-xs font-bold">جاري تحميل المحادثة...</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-center opacity-40">
                        <div className="bg-slate-100 p-4 rounded-full">
                            <MessageSquare className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-sm font-bold">لا توجد تعليقات بعد. كن أول من يترك انطباعاً!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 group">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                {getInitials(comment.profiles?.full_name)}
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-baseline gap-3">
                                    <span className="font-bold text-slate-900 text-sm">
                                        {comment.profiles?.full_name || 'مستخدم غير معروف'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTime(comment.created_at)}
                                    </span>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl rounded-tr-none text-slate-600 text-sm leading-relaxed">
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-slate-50 bg-slate-50/30 rounded-b-3xl">
                <form onSubmit={handleSendMessage} className="relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="اكتب ملاحظة أو تحديث هنا..."
                        className="w-full bg-white border border-slate-200 rounded-2xl pr-4 pl-14 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none min-h-[80px]"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!newComment.trim() || sending}
                        className={`absolute left-3 bottom-3 p-3 rounded-xl transition-all
              ${!newComment.trim() || sending
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:scale-110 active:scale-95'}
            `}
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
                <p className="text-[10px] text-slate-400 mt-2 text-center flex items-center justify-center gap-1 font-bold italic">
                    <AlertCircle className="w-3 h-3" />
                    يتم حفظ التغييرات والتعليقات تلقائياً في السجل التاريخي للبلاغ
                </p>
            </div>
        </div>
    );
};

export default TicketComments;
