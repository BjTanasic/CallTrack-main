import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FREE_PLAN_CALL_LIMIT = 10;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function resolveUserByPhoneNumber(phoneNumber: string): Promise<string | null> {
  const { data } = await supabase
    .from("settings")
    .select("user_id")
    .eq("key", "twilio_phone_number")
    .eq("value", phoneNumber)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function isUserSubscribed(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return data !== null;
}

async function getUserCallCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("calls")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

async function getOrCreateContact(phoneNumber: string, userId: string) {
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("phone_number", phoneNumber)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from("contacts")
    .insert({ phone_number: phoneNumber, name: "", user_id: userId })
    .select("id")
    .single();

  return created?.id ?? null;
}

async function getUserTwilioCredentials(userId: string): Promise<{ accountSid: string; authToken: string } | null> {
  const { data: rows } = await supabase
    .from("settings")
    .select("key, value")
    .eq("user_id", userId)
    .in("key", ["twilio_account_sid", "twilio_auth_token"]);

  const map: Record<string, string> = {};
  for (const r of rows ?? []) map[r.key] = r.value;

  const rawSid = map["twilio_account_sid"];
  const rawToken = map["twilio_auth_token"];
  const accountSid = (!rawSid || rawSid === "platform") ? Deno.env.get("TWILIO_ACCOUNT_SID") : rawSid;
  const authToken = (!rawToken || rawToken === "platform") ? Deno.env.get("TWILIO_AUTH_TOKEN") : rawToken;

  if (!accountSid || !authToken) return null;
  return { accountSid, authToken };
}

async function sendAutoSms(callerNumber: string, businessNumber: string, contactId: string | null, userId: string) {
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .eq("user_id", userId)
    .in("key", ["auto_sms_enabled", "auto_sms_template", "business_name"]);

  const settingsMap: Record<string, string> = {};
  for (const s of settings ?? []) {
    settingsMap[s.key] = s.value;
  }

  if (settingsMap["auto_sms_enabled"] !== "true") return;

  const businessName = settingsMap["business_name"] || "Our Business";
  const template = (settingsMap["auto_sms_template"] || "Hi! We missed your call at {business_name}. We'll get back to you soon. Reply here to reach us.")
    .replace("{business_name}", businessName);

  const creds = await getUserTwilioCredentials(userId);
  if (!creds) return;
  const { accountSid, authToken } = creds;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append("To", callerNumber);
  formData.append("From", businessNumber);
  formData.append("Body", template);

  const response = await fetch(twilioUrl, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  const result = await response.json();

  let conversationId: string | null = null;

  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("customer_number", callerNumber)
    .eq("business_number", businessNumber)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingConv) {
    conversationId = existingConv.id;
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);
  } else {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        contact_id: contactId,
        customer_number: callerNumber,
        business_number: businessNumber,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        user_id: userId,
      })
      .select("id")
      .single();
    conversationId = newConv?.id ?? null;
  }

  if (conversationId) {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      body: template,
      direction: "outbound",
      status: result.status ?? "sent",
      twilio_sid: result.sid ?? null,
      user_id: userId,
    });
  }

  return result.sid;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const isStatusCallback = url.pathname.includes("status");

    const body = await req.text();
    const params = new URLSearchParams(body);

    const callStatus = params.get("CallStatus");
    const callerNumber = params.get("From") || params.get("Called") || "";
    const calledNumber = params.get("To") || params.get("Called") || "";
    const callSid = params.get("CallSid") || "";
    const callDuration = parseInt(params.get("CallDuration") || "0");

    const userId = await resolveUserByPhoneNumber(calledNumber);

    if (!userId) {
      console.error("No user found for phone number:", calledNumber);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
      return new Response(twiml, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    const subscribed = await isUserSubscribed(userId);

    if (!subscribed) {
      const callCount = await getUserCallCount(userId);
      if (callCount >= FREE_PLAN_CALL_LIMIT) {
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. We are unable to take your call right now. Goodbye.</Say>
</Response>`;
        return new Response(twiml, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/xml" },
        });
      }
    }

    if (isStatusCallback) {
      const isMissed = ["no-answer", "busy", "failed"].includes(callStatus ?? "");

      if (isMissed) {
        const contactId = await getOrCreateContact(callerNumber, userId);

        const { data: call } = await supabase
          .from("calls")
          .select("id, sms_sent")
          .eq("twilio_call_sid", callSid)
          .maybeSingle();

        if (call) {
          await supabase
            .from("calls")
            .update({ status: "missed", duration: callDuration, contact_id: contactId })
            .eq("id", call.id);

          if (!call.sms_sent) {
            const smsSid = await sendAutoSms(callerNumber, calledNumber, contactId, userId);
            if (smsSid) {
              await supabase
                .from("calls")
                .update({ sms_sent: true, sms_sent_at: new Date().toISOString() })
                .eq("id", call.id);
            }
          }
        }
      } else if (callStatus === "completed") {
        await supabase
          .from("calls")
          .update({ status: "answered", duration: callDuration })
          .eq("twilio_call_sid", callSid);
      }

      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const contactId = await getOrCreateContact(callerNumber, userId);

    await supabase.from("calls").insert({
      contact_id: contactId,
      caller_number: callerNumber,
      called_number: calledNumber,
      status: "ringing",
      twilio_call_sid: callSid,
      sms_sent: false,
      user_id: userId,
    });

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. We are unable to take your call right now, but we will text you shortly. Goodbye.</Say>
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("twilio-voice error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
