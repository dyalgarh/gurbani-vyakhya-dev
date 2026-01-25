import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../../lib/db";
import { sendEmail } from "../../lib/email";
import { sendSMS } from "../../lib/sms";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  await supabase.rpc("increment_current_day");

  const BASE_URL = process.env.BASE_URL!;

const { data: subs } = await supabase
  .from("subscriptions")
  .select(`
    id,
    user_id,
    path_id,
    secure_token,
    current_day,
    delivery_method,
    users ( email, phone )
  `)
  .eq("status", "active");

for (const sub of subs || []) {
  console.log("inside loop: ", sub);

  const link = `${BASE_URL}/todays-path/${sub.secure_token}/${sub.current_day}`;
  const user = sub.users as { email?: string; phone?: string };
  if (!user) continue;

  let deliveryStatus = "success";

  try {
    if (sub.delivery_method === "email" && user.email) {
      await sendEmail(
        user.email,
        "Your today's Gurbani reflection 🙏",
        `<p>Today's reflection:</p><a href="${link}">Read now</a>`
      );
    } else if (sub.delivery_method === "sms" && user.phone) {
      console.log("user phone: ", user.phone);
      await sendSMS(
        user.phone,
        `Your today's Gurbani reflection 🙏\n${link}`
      );
    } else {
      deliveryStatus = "skipped"; // No valid delivery method or contact info
    }
  } catch (err) {
    console.error("Delivery failed for subscription:", sub.id, err);
    deliveryStatus = "failed";
  }

  // Log the delivery result in delivery_logs
  const { error: logError } = await supabase.from("delivery_logs").insert({
    subscription_id: sub.id,
    day_number: sub.current_day,
    delivery_method: sub.delivery_method,
    delivery_status: deliveryStatus
  });

  if (logError) {
    console.error("Failed to log delivery:", logError);
  }
}


  res.json({ ok: true });
}