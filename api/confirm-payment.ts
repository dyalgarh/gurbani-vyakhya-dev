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
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (!session || session.payment_status !== "paid") {
      return res.status(400).json({ success: false, message: "Payment not completed" });
    }

    const userId = session.metadata?.user_id;
    const pathId = session.metadata?.path_id;

    if (!userId || !pathId) {
      return res.status(400).json({ success: false, message: "Missing metadata" });
    }

    // Update subscription as paid
    const { error } = await supabase
      .from("subscriptions")
      .update({ is_paid: true })
      .eq("user_id", userId)
      .eq("path_id", pathId);

    if (error) {
      return res.status(500).json({ success: false, message: "Failed to update subscription" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Stripe session retrieval failed" });
  }
}
