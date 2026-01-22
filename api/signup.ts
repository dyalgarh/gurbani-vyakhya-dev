// /api/signup.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/db";
import { sendEmail } from "../lib/email";
import { sendSMS } from "../lib/sms";
import crypto from "crypto";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const BASE_URL = process.env.BASE_URL!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { path_id, name, email, phone, delivery_method, payment_type } = req.body;

  if (!path_id || !name) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }
  if (!email && !phone) {
    return res.status(400).json({ success: false, message: "Email or phone required" });
  }

  // 1️⃣ Create or fetch user
  const { data: user, error: userError } = await supabase
    .from("users")
    .upsert(
      { name, email, phone },
      { onConflict: email ? "email" : "phone" }
    )
    .select()
    .single();

  if (userError || !user) {
    return res.status(500).json({ success: false, message: "User creation failed" });
  }

  // 2️⃣ Create subscription if not exists
  const secureToken = crypto.randomUUID();
  const unsubscribeToken = crypto.randomUUID();

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("path_id", path_id)
    .single();

  if (!existingSub) {
    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        path_id,
        delivery_method,
        status: "active",
        current_day: 0,
        secure_token: secureToken,
        unsubscribe_token: unsubscribeToken,
        is_paid: false
      });

    if (subError) {
      return res.status(400).json({ success: false, message: "Subscription creation failed" });
    }
  }

  // 3️⃣ Handle free subscription
  if (payment_type === "free") {
    if (delivery_method === "email" && email) {
      await sendEmail(email, "Thank you for subscribing 🙏", "<p>Your daily Gurbani will start tomorrow.</p>");
    }
    if (delivery_method === "sms" && phone) {
      await sendSMS(phone, "Thank you for subscribing to Gurbani Vyakhya!");
    }

    return res.json({
      success: true,
      message: "Subscription created. Reflections will start from tomorrow."
    });
  }

  // 4️⃣ Handle paid subscription (support / donation)
  if (payment_type === "paid") {
    // Fetch path to get Stripe price IDs and type
    const { data: path } = await supabase
      .from("paths")
      .select("stripe_price_id, stripe_recurring_price_id, payment_type")
      .eq("id", path_id)
      .single();

    if (!path) {
      return res.status(500).json({ success: false, message: "Path not found" });
    }

    // Pick correct price ID based on path's payment_type
    let priceId: string | undefined;
    if (path.payment_type === "recurring") {
      priceId = path.stripe_recurring_price_id;
    } else {
      priceId = path.stripe_price_id;
    }

    if (!priceId) {
      return res.status(500).json({ success: false, message: "Stripe price not configured for this path" });
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: path.payment_type === "recurring" ? "subscription" : "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        }
      ],
      success_url: `${BASE_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancel`,
      metadata: {
        user_id: user.id,
        path_id,
      },
    });

    return res.json({
      success: true,
      checkout_url: session.url
    });
  }

  res.status(400).json({ success: false, message: "Invalid payment_type" });
}
