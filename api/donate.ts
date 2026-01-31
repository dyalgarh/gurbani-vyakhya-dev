import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { supabase } from "../lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const BASE_URL = process.env.BASE_URL!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { name, email, amount, is_anonymous } = req.body;

  // create Stripe Checkout session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [{
      price_data: {
        currency: "cad",
        unit_amount: amount * 100, // cents
        product_data: { name: "Donation" }
      },
      quantity: 1
    }],
    success_url: `${BASE_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/cancel`,
  });

  // save pending donation in Supabase
  await supabase.from("donations").insert({
    name,
    email,
    amount: amount * 100,
    currency: "CAD",
    status: "pending",
    stripe_session_id: session.id,
    is_anonymous
  });

  res.json({success: true, url: session.url });
}