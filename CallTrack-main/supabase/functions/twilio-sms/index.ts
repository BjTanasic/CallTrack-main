import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const from = params.get("From") || "";
    const to = params.get("To") || "";
    const messageBody = params.get("Body") || "";
    const messageSid = params.get("MessageSid") || "";

    if (!from || !messageBody) {
      return new Response("Bad Request", { status: 400, headers: corsHeaders });
    }

    const userId = await resolveUserByPhoneNumber(to);

    if (!userId) {
      console.error("No user found for phone number:", to);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
      return new Response(twiml, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/xml" },
      });
    }

    const contactId = await getOrCreateContact(from, userId);

    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id, unread_count")
      .eq("customer_number", from)
      .eq("business_number", to)
      .eq("user_id", userId)
      .maybeSingle();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          unread_count: (existingConv.unread_count || 0) + 1,
        })
        .eq("id", conversationId);
    } else {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          contact_id: contactId,
          customer_number: from,
          business_number: to,
          last_message_at: new Date().toISOString(),
          unread_count: 1,
          user_id: userId,
        })
        .select("id")
        .single();
      conversationId = newConv!.id;
    }

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      body: messageBody,
      direction: "inbound",
      status: "received",
      twilio_sid: messageSid,
      user_id: userId,
    });

    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

    return new Response(twiml, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("twilio-sms error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
