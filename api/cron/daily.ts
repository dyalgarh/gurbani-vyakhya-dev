import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../../lib/db";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  await supabase.rpc("increment_current_day");
  res.json({ ok: true });
}