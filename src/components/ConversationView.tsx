import { useEffect, useRef, useState } from 'react';
import { Send, ArrowLeft, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Conversation, Message } from '../types';
import { formatTime, formatDate } from '../lib/dateUtils';
import { formatPhone } from '../lib/phoneUtils';

interface ConversationViewProps {
  conversation: Conversation;
  onBack: () => void;
  onMessagesRead: () => void;
}

export default function ConversationView({ conversation, onBack, onMessagesRead }: ConversationViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadMessages();
    markAsRead();

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadMessages() {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  }

  async function markAsRead() {
    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .eq('id', conversation.id);
    onMessagesRead();
  }

  async function sendMessage() {
    const body = input.trim();
    if (!body || sending) return;

    setSending(true);
    setError('');
    setInput('');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId: conversation.id, body }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Failed to send message');
        setInput(body);
      }
    } catch {
      setError('Network error. Please try again.');
      setInput(body);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const displayName = conversation.contacts?.name || formatPhone(conversation.customer_number);

  const grouped = messages.reduce<{ date: string; messages: Message[] }[]>((acc, msg) => {
    const date = formatDate(msg.created_at);
    const last = acc[acc.length - 1];
    if (last && last.date === date) {
      last.messages.push(msg);
    } else {
      acc.push({ date, messages: [msg] });
    }
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-white shrink-0">
        <button
          onClick={onBack}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <User size={16} className="text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{displayName}</p>
          <p className="text-xs text-slate-400 font-mono">{formatPhone(conversation.customer_number)}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          grouped.map(({ date, messages: dayMessages }) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 border-t border-slate-200" />
                <span className="text-xs text-slate-400 font-medium">{date}</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>
              <div className="space-y-2">
                {dayMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.direction === 'outbound'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      <p className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-slate-200 bg-white shrink-0">
        {error && (
          <p className="text-xs text-red-500 mb-2">{error}</p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            className="flex-1 resize-none px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32 overflow-y-auto"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            {sending ? (
              <Loader2 size={16} className="text-white animate-spin" />
            ) : (
              <Send size={16} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
