import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existing } = await serviceClient
      .from("settings")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "twilio_phone_number")
      .maybeSingle();

    if (existing?.value) {
      return new Response(JSON.stringify({ phone_number: existing.value, already_provisioned: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!accountSid || !authToken) {
      return new Response(JSON.stringify({ error: "Platform Twilio credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const voiceWebhookUrl = `${supabaseUrl}/functions/v1/twilio-voice`;
    const voiceStatusUrl = `${supabaseUrl}/functions/v1/twilio-voice/status`;
    const smsWebhookUrl = `${supabaseUrl}/functions/v1/twilio-sms`;

    const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/AU/Local.json?SmsEnabled=true&VoiceEnabled=true&Limit=1`;

    const searchRes = await fetch(searchUrl, {
      headers: {
        "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
      },
    });

    if (!searchRes.ok) {
      const err = await searchRes.text();
      return new Response(JSON.stringify({ error: "Failed to search for available numbers", details: err }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchRes.json();
    const available = searchData.available_phone_numbers;

    if (!available || available.length === 0) {
      return new Response(JSON.stringify({ error: "No Australian phone numbers available" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phoneNumber = available[0].phone_number;

    const purchaseForm = new URLSearchParams({
      PhoneNumber: phoneNumber,
      VoiceUrl: voiceWebhookUrl,
      VoiceMethod: "POST",
      StatusCallback: voiceStatusUrl,
      StatusCallbackMethod: "POST",
      SmsUrl: smsWebhookUrl,
      SmsMethod: "POST",
    });

    const purchaseRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
      {
        method: "POST",
        headers: {
          "Authorization": "Basic " + btoa(`${accountSid}:${authToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: purchaseForm,
      }
    );

    if (!purchaseRes.ok) {
      const err = await purchaseRes.text();
      return new Response(JSON.stringify({ error: "Failed to purchase phone number", details: err }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const purchased = await purchaseRes.json();
    const provisionedNumber = purchased.phone_number;

    const settingsToUpsert = [
      { key: "twilio_phone_number", value: provisionedNumber },
      { key: "twilio_account_sid", value: "platform" },
      { key: "twilio_auth_token", value: "platform" },
    ];

    for (const s of settingsToUpsert) {
      await serviceClient
        .from("settings")
        .upsert(
          { key: s.key, value: s.value, user_id: user.id, updated_at: new Date().toISOString() },
          { onConflict: "user_id,key" }
        );
    }

    return new Response(JSON.stringify({ phone_number: provisionedNumber }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
