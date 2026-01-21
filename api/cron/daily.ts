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

  console.log(subs)

for (const sub of subs || []) {
    console.log("inside loop: ", sub);
  const link = `${BASE_URL}/todays-path/${sub.secure_token}/${sub.current_day}`;
    const user = sub.users as { email?: string; phone?: string };
    console.log("user: ", user);
  if (!user) continue;
  if (sub.delivery_method === "email" && user.email) {
console.log("user email: ", user.email);
    await sendEmail(
      user.email,
      "Your daily Gurbani reflection 🙏",
      `<p>Today's reflection:</p><a href="${link}">Read now</a>`
    );
  }

    if (sub.delivery_method === "sms" && user.phone) {
        console.log("user phone: ", user.phone);
        await sendSMS(
        user.phone,
        `Your daily Gurbani reflection 🙏\n${link}`
        );
    }
    }

  res.json({ ok: true });
}