import { useEffect, useState, useCallback, useRef } from 'react';
import {
    Send,
    MessageSquare,
    Clock,
    Loader2,
    AlertCircle,
    Reply,
    Paperclip,
    X,
    Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/supabase';
import { uploadTicketImage } from '../../lib/storage';

type Comment = Database['public']['Tables']['ticket_comments']['Row'] & {
    profiles: {
        full_name: string | null;
        role: string | null;
    } | null;
    comment_attachments?: {
        file_url: string;
        file_type: string | null;
        file_name: string | null;
    }[];
};

interface TicketCommentsProps {
    ticketId: string;
}

const TicketComments: React.FC<TicketCommentsProps> = ({ ticketId }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchComments = useCallback(async () => {
        try {
            const { data, error } = await (supabase
                .from('ticket_comments') as any)
                .select('*, profiles(full_name, role), comment_attachments(file_url, file_type, file_name)')
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
        if (!newComment.trim() && !attachment || sending) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setSending(true);

        try {
            let attachmentUrl = null;
            if (attachment) {
                attachmentUrl = await uploadTicketImage(attachment);
            }

            const { data: comment, error } = await (supabase
                .from('ticket_comments') as any)
                .insert({
                    ticket_id: ticketId,
                    user_id: user.id,
                    content: newComment.trim(),
                    parent_id: replyTo?.id || null
                })
                .select()
                .single();

            if (error) throw error;

            if (attachmentUrl && comment) {
                await (supabase.from('comment_attachments') as any).insert({
                    comment_id: comment.id,
                    file_url: attachmentUrl,
                    file_name: attachment?.name,
                    file_type: attachment?.type
                });
            }

            setNewComment('');
            setReplyTo(null);
            setAttachment(null);
            await fetchComments();
        } catch (err) {
            console.error('Error sending comment:', err);
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
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[600px]">
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
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
                    <div className="space-y-6">
                        {comments.filter(c => !c.parent_id).map((comment) => (
                            <div key={comment.id} className="space-y-4">
                                <div className="flex gap-4 group">
                                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        {getInitials(comment.profiles?.full_name)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-baseline justify-between">
                                            <div className="flex items-baseline gap-3">
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {comment.profiles?.full_name || 'مستخدم غير معروف'}
                                                </span>
                                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatTime(comment.created_at)}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setReplyTo(comment)}
                                                className="text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                                            >
                                                رد
                                            </button>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl rounded-tr-none text-slate-600 text-sm leading-relaxed relative">
                                            {comment.content}
                                            {comment.comment_attachments?.map((att, idx) => (
                                                <div key={idx} className="mt-2 rounded-xl overflow-hidden border border-slate-200">
                                                    {att.file_type?.startsWith('image/') ? (
                                                        <img src={att.file_url} className="max-h-48 w-full object-cover" alt="attachment" />
                                                    ) : (
                                                        <a href={att.file_url} target="_blank" rel="noreferrer" className="p-2 flex items-center gap-2 bg-white text-blue-600 text-xs font-bold font-mono">
                                                            <ImageIcon className="w-4 h-4" />
                                                            {att.file_name || 'ملف مرفق'}
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Replies */}
                                <div className="mr-14 space-y-4 border-r-2 border-slate-100 pr-4">
                                    {comments.filter(reply => reply.parent_id === comment.id).map(reply => (
                                        <div key={reply.id} className="flex gap-3 scale-95 origin-right">
                                            <div className="h-8 w-8 shrink-0 rounded-full bg-slate-50 flex items-center justify-center font-bold text-slate-400 text-xs">
                                                {getInitials(reply.profiles?.full_name)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-baseline gap-3">
                                                    <span className="font-bold text-slate-900 text-[11px]">
                                                        {reply.profiles?.full_name}
                                                    </span>
                                                    <span className="text-[9px] text-slate-400">
                                                        {formatTime(reply.created_at)}
                                                    </span>
                                                </div>
                                                <div className="bg-slate-50/50 p-3 rounded-xl rounded-tr-none text-slate-600 text-xs leading-relaxed">
                                                    {reply.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-slate-50 bg-slate-50/30 rounded-b-3xl space-y-4">
                {replyTo && (
                    <div className="bg-blue-50 px-4 py-2 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600">
                            <Reply className="w-3 h-3" />
                            الرد على: {replyTo.profiles?.full_name}
                        </div>
                        <button onClick={() => setReplyTo(null)} className="text-blue-400 hover:text-blue-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {attachment && (
                    <div className="bg-emerald-50 px-4 py-2 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                            <ImageIcon className="w-3 h-3" />
                            ملف مرفق: {attachment.name}
                        </div>
                        <button onClick={() => setAttachment(null)} className="text-emerald-400 hover:text-emerald-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="relative">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                    />
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={replyTo ? "اكتب ردك هنا..." : "اكتب ملاحظة أو تحديث هنا..."}
                        className="w-full bg-white border border-slate-200 rounded-2xl pr-4 pl-24 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none min-h-[80px]"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <div className="absolute left-3 bottom-3 flex gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <button
                            type="submit"
                            disabled={(!newComment.trim() && !attachment) || sending}
                            className={`p-3 rounded-xl transition-all
                  ${(!newComment.trim() && !attachment) || sending
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:scale-110 active:scale-95'}
                `}
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
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
