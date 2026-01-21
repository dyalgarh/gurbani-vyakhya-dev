// /api/free-signup.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/db";
import { sendEmail } from "../lib/email";
import { sendSMS } from "../lib/sms";

import crypto from "crypto";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { path_id, name, email, phone, delivery_method } = req.body;

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

  // 2️⃣ Create subscription
  const secureToken = crypto.randomUUID();

  const { error: subError } = await supabase
    .from("subscriptions")
    .insert({
      user_id: user.id,
      path_id,
      delivery_method,
      status: "active",
      current_day: 0,
      secure_token: secureToken
    });

  if (subError) {
    return res.status(400).json({
      success: false,
      message: "Already subscribed or subscription error"
    });
  }

    if (delivery_method === "email" && email) {
    await sendEmail(
      email,
      "Thank you for subscribing 🙏",
      "<p>Your daily Gurbani will start tomorrow.</p>"
    );
  }
  if (delivery_method === "sms" && phone) {
    await sendSMS(
      phone,
      "Thank you for subscribing to Gurbani Vyakhya!"
    );
  }

  return res.json({
    success: true,
    message: "Subscription created. Reflections will start from tomorrow."
  });
}
