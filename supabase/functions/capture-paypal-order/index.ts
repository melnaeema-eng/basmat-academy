import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function paypalBaseUrl() {
  return Deno.env.get("PAYPAL_ENV") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function paypalAccessToken() {
  const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!clientId || !secret) throw new Error("PayPal secrets are not configured");

  const basic = btoa(`${clientId}:${secret}`);
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = await response.json();
  if (!response.ok || !json.access_token) throw new Error(json.error_description || "PayPal authentication failed");
  return json.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) throw new Error("Authentication required");

    const { orderId } = await req.json();
    if (!orderId) throw new Error("orderId is required");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .select("*")
      .eq("provider_order_id", orderId)
      .eq("user_id", userData.user.id)
      .single();
    if (paymentError || !payment) throw new Error("Payment record not found");

    if (payment.status === "paid") {
      return new Response(JSON.stringify({ success: true, alreadyPaid: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await paypalAccessToken();
    const captureResponse = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": crypto.randomUUID(),
      },
      body: "{}",
    });
    const capture = await captureResponse.json();
    if (!captureResponse.ok) throw new Error(capture.message || "PayPal capture failed");

    const purchaseUnit = capture.purchase_units?.[0];
    const captureItem = purchaseUnit?.payments?.captures?.[0];
    const capturedAmount = Number(captureItem?.amount?.value || -1);
    const capturedCurrency = captureItem?.amount?.currency_code;

    if (capture.status !== "COMPLETED" || captureItem?.status !== "COMPLETED") {
      throw new Error("PayPal payment is not completed");
    }
    if (capturedCurrency !== payment.currency || Math.abs(capturedAmount - Number(payment.amount)) > 0.001) {
      throw new Error("PayPal amount verification failed");
    }

    const { error: finalizeError } = await admin.rpc("finalize_paypal_payment", {
      p_payment_id: payment.id,
      p_capture_id: captureItem?.id || "",
    });
    if (finalizeError) throw finalizeError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Unexpected error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
