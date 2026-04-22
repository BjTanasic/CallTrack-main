export interface Contact {
  id: string;
  phone_number: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  contact_id: string | null;
  caller_number: string;
  called_number: string;
  status: 'ringing' | 'missed' | 'answered' | 'voicemail';
  duration: number;
  sms_sent: boolean;
  sms_sent_at: string | null;
  twilio_call_sid: string | null;
  created_at: string;
  contacts?: Contact | null;
}

export interface Conversation {
  id: string;
  contact_id: string | null;
  customer_number: string;
  business_number: string;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  contacts?: Contact | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  twilio_sid: string | null;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export type NavPage = 'dashboard' | 'missed-calls' | 'conversations' | 'settings';
