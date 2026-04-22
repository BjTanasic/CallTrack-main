import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-04-10" });

    const { origin, userId, userEmail, interval = "month" } = await req.json();

    let priceId: string | null = null;

    if (interval === "year") {
      priceId = Deno.env.get("STRIPE_PRICE_ID_YEARLY") ?? null;
    } else {
      priceId = Deno.env.get("STRIPE_PRICE_ID_MONTHLY") ?? Deno.env.get("STRIPE_PRICE_ID") ?? null;
    }

    if (!priceId) {
      return new Response(JSON.stringify({ error: "No active subscription price found. Please configure STRIPE_PRICE_ID_MONTHLY and STRIPE_PRICE_ID_YEARLY secrets." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}?checkout=success`,
      cancel_url: `${origin}?checkout=cancelled`,
      client_reference_id: userId ?? undefined,
      customer_email: userEmail ?? undefined,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-checkout error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
