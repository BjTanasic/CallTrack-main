import { useEffect, useState } from 'react';
import { Save, Copy, CheckCircle, Phone, MessageSquare, Lock, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

interface SettingsData {
  business_name: string;
  twilio_phone_number: string;
  auto_sms_template: string;
  auto_sms_enabled: string;
}

export default function Settings() {
  const { user, isSubscribed, session } = useAuth();
  const [settings, setSettings] = useState<SettingsData>({
    business_name: '',
    twilio_phone_number: '',
    auto_sms_template: '',
    auto_sms_enabled: 'true',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState('');

  const DEFAULT_SETTINGS = {
    business_name: 'My Business',
    twilio_phone_number: '',
    auto_sms_template: "Hi! We missed your call at {business_name}. We'll get back to you as soon as possible. Reply here to reach us directly.",
    auto_sms_enabled: 'true',
  };

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('key, value').eq('user_id', user!.id);
    const map: Record<string, string> = {};
    for (const row of data ?? []) map[row.key] = row.value;

    if ((data ?? []).length === 0) {
      const seedEntries = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
        key, value, user_id: user!.id,
      }));
      await supabase.from('settings').insert(seedEntries);
      setSettings(DEFAULT_SETTINGS);
    } else {
      setSettings({
        business_name: map['business_name'] ?? '',
        twilio_phone_number: map['twilio_phone_number'] ?? '',
        auto_sms_template: map['auto_sms_template'] ?? '',
        auto_sms_enabled: map['auto_sms_enabled'] ?? 'true',
      });
    }
    setLoading(false);
  }

  async function saveSettings() {
    setSaving(true);
    const entriesToSave = {
      business_name: settings.business_name,
      auto_sms_template: settings.auto_sms_template,
      auto_sms_enabled: settings.auto_sms_enabled,
    };
    for (const [key, value] of Object.entries(entriesToSave)) {
      await supabase
        .from('settings')
        .upsert({ key, value, user_id: user!.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id,key' });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function requestNewNumber() {
    setProvisioning(true);
    setProvisionError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-number`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (data.phone_number) {
        setSettings(s => ({ ...s, twilio_phone_number: data.phone_number }));
      } else {
        setProvisionError(data.error ?? 'Failed to provision a number. Please try again.');
      }
    } catch {
      setProvisionError('Network error. Please try again.');
    }
    setProvisioning(false);
  }

  async function copyNumber() {
    await navigator.clipboard.writeText(settings.twilio_phone_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const templateVars = ['{business_name}'];
  const charCount = settings.auto_sms_template.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your business info and auto-reply messages</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Phone size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Business Info</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Name</label>
          <input
            type="text"
            value={settings.business_name}
            onChange={(e) => setSettings((s) => ({ ...s, business_name: e.target.value }))}
            placeholder="e.g. Smith Plumbing Co."
            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Business Phone Number</label>
          {settings.twilio_phone_number ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-sm font-mono font-medium text-emerald-800 tracking-wide">
                  {settings.twilio_phone_number}
                </span>
                <span className="ml-auto text-xs text-emerald-600 font-medium">Active</span>
              </div>
              <button
                onClick={copyNumber}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600 shrink-0"
              >
                {copied ? <><CheckCircle size={13} className="text-emerald-500" /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-3.5 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-sm text-amber-800">No phone number assigned yet</span>
              </div>
              <button
                onClick={requestNewNumber}
                disabled={provisioning}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {provisioning ? (
                  <><Loader2 size={14} className="animate-spin" /> Provisioning number...</>
                ) : (
                  <><Phone size={14} /> Get my phone number</>
                )}
              </button>
              {provisionError && (
                <p className="text-xs text-red-500">{provisionError}</p>
              )}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-1.5">
            This number is automatically assigned to your account. Customers call and text this number.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare size={16} className="text-slate-500" />
          <h2 className="font-semibold text-slate-800">Auto-SMS Template</h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Auto-send SMS on missed call</span>
          <button
            onClick={() => setSettings((s) => ({ ...s, auto_sms_enabled: s.auto_sms_enabled === 'true' ? 'false' : 'true' }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.auto_sms_enabled === 'true' ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${settings.auto_sms_enabled === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700">Message Template</label>
            {isSubscribed ? (
              <span className={`text-xs ${charCount > 160 ? 'text-amber-500 font-medium' : 'text-slate-400'}`}>{charCount}/160</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <Lock size={10} /> Pro only
              </span>
            )}
          </div>
          <div className="relative">
            <textarea
              value={settings.auto_sms_template}
              onChange={(e) => isSubscribed && setSettings((s) => ({ ...s, auto_sms_template: e.target.value }))}
              readOnly={!isSubscribed}
              rows={4}
              className={`w-full px-3.5 py-2.5 text-sm border rounded-lg resize-none transition-colors ${
                isSubscribed
                  ? 'border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed select-none'
              }`}
            />
            {!isSubscribed && (
              <div className="absolute inset-0 rounded-lg flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                <div className="flex flex-col items-center gap-2 text-center px-6">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Lock size={15} className="text-amber-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Upgrade to customize this message</p>
                  <p className="text-xs text-slate-500">Free plan uses the default template. Subscribe to personalize your auto-reply.</p>
                </div>
              </div>
            )}
          </div>
          {isSubscribed && (
            <div className="flex items-center gap-2 mt-2">
              <p className="text-xs text-slate-400">Available variables:</p>
              {templateVars.map((v) => (
                <code key={v} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{v}</code>
              ))}
            </div>
          )}
        </div>
      </div>

      {settings.twilio_phone_number && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
          <RefreshCw size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-slate-600">Need a different number?</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Contact support to have your number changed. Note that existing customers will need to be notified of the new number.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saved ? (
            <><CheckCircle size={15} /> Saved!</>
          ) : saving ? (
            <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
          ) : (
            <><Save size={15} /> Save Settings</>
          )}
        </button>
      </div>
    </div>
  );
}
