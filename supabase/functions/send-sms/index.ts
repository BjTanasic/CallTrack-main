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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { conversationId, body: messageBody } = await req.json();

    if (!conversationId || !messageBody) {
      return new Response(JSON.stringify({ error: "Missing conversationId or body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conversation } = await supabase
      .from("conversations")
      .select("customer_number, business_number, user_id")
      .eq("id", conversationId)
      .maybeSingle();

    if (!conversation) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: credRows } = await supabase
      .from("settings")
      .select("key, value")
      .eq("user_id", conversation.user_id)
      .in("key", ["twilio_account_sid", "twilio_auth_token"]);

    const credMap: Record<string, string> = {};
    for (const r of credRows ?? []) credMap[r.key] = r.value;

    const accountSid = credMap["twilio_account_sid"] || Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = credMap["twilio_auth_token"] || Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!accountSid || !authToken) {
      return new Response(JSON.stringify({ error: "Twilio credentials not configured. Add your Account SID and Auth Token in Settings." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append("To", conversation.customer_number);
    formData.append("From", conversation.business_number);
    formData.append("Body", messageBody);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      return new Response(JSON.stringify({ error: twilioResult.message || "Twilio error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: message } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        body: messageBody,
        direction: "outbound",
        status: twilioResult.status ?? "sent",
        twilio_sid: twilioResult.sid ?? null,
        user_id: conversation.user_id,
      })
      .select("*")
      .single();

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return new Response(JSON.stringify({ success: true, message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-sms error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
