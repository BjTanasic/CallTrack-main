import { useEffect, useState } from 'react';
import { MessageSquare, Search, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Conversation } from '../types';
import { formatDistanceToNow } from '../lib/dateUtils';
import { formatPhone } from '../lib/phoneUtils';
import ConversationView from './ConversationView';

interface NewConvForm {
  customerNumber: string;
  customerName: string;
}

export default function Conversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewConvForm>({ customerNumber: '', customerName: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadConversations();

    const channel = supabase
      .channel('conversations-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        loadConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('*, contacts(name, phone_number)')
      .order('last_message_at', { ascending: false });
    setConversations((data as Conversation[]) ?? []);
    setLoading(false);
  }

  function handleMessagesRead() {
    setConversations((prev) =>
      prev.map((c) => (c.id === selected?.id ? { ...c, unread_count: 0 } : c))
    );
  }

  async function handleNewConversation() {
    const phone = form.customerNumber.trim();
    if (!phone) { setFormError('Please enter a phone number.'); return; }

    setSubmitting(true);
    setFormError('');

    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .eq('user_id', user!.id)
      .eq('key', 'twilio_phone_number')
      .maybeSingle();

    const businessNumber = settings?.value || 'N/A';

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('*, contacts(name, phone_number)')
      .eq('customer_number', phone)
      .eq('business_number', businessNumber)
      .eq('user_id', user!.id)
      .maybeSingle();

    if (existingConv) {
      setSelected(existingConv as Conversation);
      setShowModal(false);
      setForm({ customerNumber: '', customerName: '' });
      setSubmitting(false);
      return;
    }

    let contactId: string | null = null;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone_number', phone)
      .eq('user_id', user!.id)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
      if (form.customerName) {
        await supabase.from('contacts').update({ name: form.customerName }).eq('id', contactId);
      }
    } else {
      const { data: created } = await supabase
        .from('contacts')
        .insert({ phone_number: phone, name: form.customerName || '', user_id: user!.id })
        .select('id')
        .single();
      contactId = created?.id ?? null;
    }

    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        contact_id: contactId,
        customer_number: phone,
        business_number: businessNumber,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        user_id: user!.id,
      })
      .select('*, contacts(name, phone_number)')
      .single();

    if (newConv) {
      setSelected(newConv as Conversation);
      await loadConversations();
    }

    setShowModal(false);
    setForm({ customerNumber: '', customerName: '' });
    setSubmitting(false);
  }

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.customer_number.includes(q) || (c.contacts?.name || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex h-full overflow-hidden">
      <div className={`flex flex-col border-r border-slate-200 bg-white ${selected ? 'hidden lg:flex lg:w-80 xl:w-96' : 'flex-1 lg:flex-none lg:w-80 xl:w-96'}`}>
        <div className="px-4 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-900">Conversations</h1>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={13} /> New
            </button>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-slate-400">
              <MessageSquare size={36} className="mb-3 opacity-30" />
              <p className="font-medium text-sm">No conversations yet</p>
              <p className="text-xs mt-1 mb-3">Start one manually or wait for a customer to reply</p>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={13} /> New Conversation
              </button>
            </div>
          ) : (
            filtered.map((conv) => {
              const isActive = selected?.id === conv.id;
              const displayName = conv.contacts?.name || formatPhone(conv.customer_number);
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelected(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 transition-colors text-left ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 relative">
                    <span className="text-sm font-semibold text-slate-500">{displayName.charAt(0).toUpperCase()}</span>
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {displayName}
                      </p>
                      <span className="text-xs text-slate-400 shrink-0">{formatDistanceToNow(conv.last_message_at)}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{formatPhone(conv.customer_number)}</p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-blue-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className={`flex-1 overflow-hidden ${selected ? 'flex flex-col' : 'hidden lg:flex lg:items-center lg:justify-center'}`}>
        {selected ? (
          <ConversationView
            conversation={selected}
            onBack={() => setSelected(null)}
            onMessagesRead={handleMessagesRead}
          />
        ) : (
          <div className="text-center text-slate-400 p-8">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Choose a conversation from the list to view messages</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">New Conversation</h2>
              <button onClick={() => { setShowModal(false); setFormError(''); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={form.customerNumber}
                  onChange={(e) => setForm((f) => ({ ...f, customerNumber: e.target.value }))}
                  placeholder="e.g. 0412 345 678"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer Name <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  placeholder="e.g. John Smith"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-slate-400">
                If this number already has a conversation it will be opened instead of creating a duplicate.
              </p>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => { setShowModal(false); setFormError(''); }} className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleNewConversation}
                disabled={submitting}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {submitting ? 'Opening...' : 'Start Conversation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
