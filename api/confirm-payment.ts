import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/db";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { session_id } = req.body;
  if (!session_id) {
    return res.status(400).json({ success: false, message: "Missing session_id" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent", "subscription"]
    });

    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({ success: false, message: "Payment not completed" });
    }

    const userId = session.metadata?.user_id;
    const pathId = session.metadata?.path_id;

    if (!userId || !pathId) {
      return res.status(400).json({ success: false, message: "Missing metadata" });
    }

    // 1️⃣ Fetch subscription (needed for subscription_id)
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("path_id", pathId)
      .single();

    if (!subscription) {
      return res.status(400).json({ success: false, message: "Subscription not found" });
    }

    // 2️⃣ Insert payment record
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: userId,
      path_id: pathId,
      subscription_id: subscription.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
      amount_cents: session.amount_total,
      currency: session.currency,
      payment_type: session.mode === "subscription" ? "recurring" : "fixed",
      status: "paid"
    });

    if (paymentError) {
      return res.status(500).json({
        success: false,
        message: "Failed to save payment"
      });
    }

    // 3️⃣ Mark subscription as paid
    const { error: subUpdateError } = await supabase
      .from("subscriptions")
      .update({ is_paid: true })
      .eq("id", subscription.id);

    if (subUpdateError) {
      return res.status(500).json({
        success: false,
        message: "Failed to update subscription"
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Stripe session retrieval failed"
    });
  }
}