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

    const { courseId } = await req.json();
    if (!courseId) throw new Error("courseId is required");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: course, error: courseError } = await admin
      .from("courses")
      .select("id,title,price")
      .eq("id", courseId)
      .single();
    if (courseError || !course) throw new Error("Course not found");

    const amount = Number(course.price || 0);
    if (amount <= 0) throw new Error("This course does not require payment");

    const { data: existingEnrollment } = await admin
      .from("enrollments")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("course_id", courseId)
      .maybeSingle();
    if (existingEnrollment) throw new Error("Already enrolled");

    const token = await paypalAccessToken();
    const orderResponse = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          description: course.title || "Basmat Academy Course",
          custom_id: `${userData.user.id}:${course.id}`,
          amount: { currency_code: "SAR", value: amount.toFixed(2) },
        }],
      }),
    });

    const order = await orderResponse.json();
    if (!orderResponse.ok || !order.id) throw new Error(order.message || "Could not create PayPal order");

    const { error: paymentError } = await admin.from("payments").insert({
      user_id: userData.user.id,
      course_id: course.id,
      method: "paypal",
      amount,
      currency: "SAR",
      status: "pending",
      provider_order_id: order.id,
    });
    if (paymentError) throw paymentError;

    return new Response(JSON.stringify({ id: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Unexpected error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
