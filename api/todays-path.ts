// /api/reflect.ts
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!
);

export default async function handler(req:VercelRequest, res: VercelResponse) {
  const { token, day } = req.query;
  const dayRaw = Array.isArray(day) ? day[0] : day;
  const dayNum = parseInt(dayRaw, 10);

  if (!token || !dayNum || dayNum < 1) {
    return res.status(400).json({ ok: false, message: "Invalid link" });
  }

  // 1️⃣ Get subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, path_id, start_date, status, current_day")
    .eq("secure_token", token)
    .single();

  if (!sub || sub.status !== "active") {
    return res.json({ ok: false, message: "Not subscribed" });
  }

  const currentDay = sub.current_day;

  if (dayNum > currentDay) {
    return res.json({ ok: false, message: "Available later" });
  }

  // 3️⃣ Fetch content
  const { data: content } = await supabase
    .from("path_content")
    .select("snippet, meaning_pb, meaning_en, reflection")
    .eq("path_id", sub.path_id)
    .eq("day_number", dayNum)
    .single();

  if (!content) {
    return res.json({ ok: false, message: "Content not found" });
  }

  return res.json({
    ok: true,
    ...content,
    canGoNext: dayNum < currentDay,
  });
}
