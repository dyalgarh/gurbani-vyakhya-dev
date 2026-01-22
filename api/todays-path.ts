// /api/todays-path.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../lib/db";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const { token, day } = req.query;

  const tokenRaw = Array.isArray(token) ? token[0] : token;
  const dayRaw = Array.isArray(day) ? day[0] : day;
  let dayNum = parseInt(dayRaw || "", 10);

  if (!tokenRaw) {
    return res.status(400).json({ ok: false, message: "Invalid link" });
  }

  // 1️⃣ Get subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("path_id, status, current_day")
    .eq("secure_token", tokenRaw)
    .single();

  if (!sub || sub.status !== "active") {
    return res.json({ ok: false, message: "Not subscribed" });
  }

  // 3️⃣ If day is missing / invalid → use current_day
  if (!Number.isInteger(dayNum) || dayNum < 1) {
    dayNum = sub.current_day;
  }
  const currentDay = sub.current_day;

  if (dayNum > currentDay) {
    return res.json({ ok: false, message: "Available later" });
  }

  // 2️⃣ Fetch content
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
