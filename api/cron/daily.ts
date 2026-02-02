import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../../lib/db";
import { sendEmail } from "../../lib/email";
import { sendSMS } from "../../lib/sms";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const isCron = req.headers["x-vercel-cron"] === "1";
  const isDev = process.env.CURRENT_ENV !== "production";

  if (!isCron && !isDev) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }

  // 1️⃣ Increment current day safely
  const { error: dayError } = await supabase.rpc("increment_current_day");
  if (dayError) {
    console.error("Failed to increment current day:", dayError);
    return res.status(500).json({ ok: false, message: "Day increment failed" });
  }

  const BASE_URL = process.env.BASE_URL!;

  // 2️⃣ Fetch active subscriptions
  const { data: subs, error: subsError } = await supabase
    .from("subscriptions")
    .select(`
      id,
      user_id,
      path_id,
      secure_token,
      current_day,
      unsubscribe_token,
      delivery_method,
      users ( email, phone ),
      paths ( content_type, total_days )
    `)
    .eq("status", "active");

  if (subsError) {
    console.error("Failed to fetch subscriptions:", subsError);
    return res.status(500).json({ ok: false, message: "Failed to fetch subscriptions" });
  }

  if (!subs || subs.length === 0) {
    return res.json({ ok: true, message: "No active subscriptions" });
  }

  // 3️⃣ Process each subscription
  for (const sub of subs) {
    try {
      const user = sub.users as { email?: string; phone?: string };
      const content_type = (sub.paths as any)?.content_type ?? "progressive";
      const totalDays = (sub.paths as any)?.total_days;

      // Prevent overflow beyond total days
      if (content_type === "progressive" && totalDays && sub.current_day > totalDays) {
        console.log("Path completed for subscription:", sub.id);
        continue;
      }

      // Prevent duplicate sends
      const { data: existingLog } = await supabase
        .from("delivery_logs")
        .select("id")
        .eq("subscription_id", sub.id)
        .eq("day_number", sub.current_day)
        .maybeSingle();

      if (existingLog) {
        console.log("Already delivered for subscription/day:", sub.id, sub.current_day);
        continue;
      }

      let link = `${BASE_URL}/todays-path/${sub.secure_token}`;
      if (content_type === "progressive") {
        link = `${link}/${sub.current_day}`;
      }

      if (!user) continue;

      let deliveryStatus: "success" | "failed" | "skipped" = "success";

      if (sub.delivery_method === "email" && user.email) {

        const { data: pathContent } = await supabase
        .from("path_content")
        .select("id,gurbani_header,gurbani,meaning_pb,meaning_en")
        .eq("path_id", sub.path_id)
        .eq("day_number", sub.current_day)
        .eq("is_active", true)
        .maybeSingle();

        await sendEmail(
          user.email,
          `Your today's Gurbani message - ${pathContent?.gurbani_header || ":"}`,
          `<!DOCTYPE html>
          <html lang="en">

          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Understanding Gurbani</title>
              <script src="https://cdn.tailwindcss.com/3.4.16"></script>
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
              <link href="https://cdnjs.cloudflare.com/ajax/libs/remixicon/4.6.0/remixicon.min.css" rel="stylesheet">
              <script>
                  tailwind.config = {
                  theme: {
                  extend: {
                  colors: {
                  primary: '#000000',
                  secondary: '#374151'
                  },
                  borderRadius: {
                  'none': '0px',
                  'sm': '4px',
                  DEFAULT: '8px',
                  'md': '12px',
                  'lg': '16px',
                  'xl': '20px',
                  '2xl': '24px',
                  '3xl': '32px',
                  'full': '9999px',
                  'button': '8px'
                  },
                  fontFamily: {
                  'inter': ['Inter', 'sans-serif']
                  }
                  }
                  }
                  }
              </script>
              <style>
                  :where([class^="ri-"])::before {
                  content: "\f3c2";
                  }
                  body {
                  font-family: 'Inter', sans-serif;
                  }
              </style>
              <script src="/todays-path/js/todays-path.js" defer></script>
          </head>

          <body class="bg-white text-gray-900">
              <!-- Page Content (hidden initially) -->
              <div id="pageContent">
                  <section class="bg-white">
                      <div class="max-w-6xl mx-auto bg-white rounded-lg shadow-sm p-8">
                          <div class="text-center mb-6">
                              <h3 class="text-xl font-medium text-gray-900 mb-2">Today's Path</h3>
                              <p id="gurbani_header" class="text-sm text-gray-600">${ pathContent?.gurbani_header || "" }</p>
                          </div>
                          <div class="space-y-6">
                              <div>
                                  <p id="gurbani" class="text-black text-2xl italic text-center bg-gray-50 p-4 rounded border-l-4 border-gray-800">
                                  ${ pathContent?.gurbani || "" }
                                  </p>
                              </div>
                              <div>
                                  <h4 class="font-medium text-2xl text-gray-900 mb-2 flex items-center gap-2">
                                  <div class="w-4 h-4 flex items-center justify-center">
                                  <i class="ri-lightbulb-line text-gray-600"></i>
                                  </div>
                                  ਪੰਜਾਬੀ ਵਿੱਚ ਵਿਆਖਿਆ
                                  </h4>
                                  <p id="pb" class="text-gray-800">
                                      ${ pathContent?.meaning_pb || "" }
                                  </p>
                              </div>
                              <div>
                                  <h4 class="font-medium text-2xl text-gray-900 mb-2 flex items-center gap-2">
                                  <div class="w-4 h-4 flex items-center justify-center">
                                  <i class="ri-lightbulb-line text-gray-800"></i>
                                  </div>
                                  Explanation in English
                                  </h4>
                                  <p id="en" class="text-gray-800">
                                      ${ pathContent?.meaning_en || "" }
                                  </p>
                              </div>
                          </div>
                      </div>
                  </section>
              </div>
          </body>
          </html>`
        );
      } else if (sub.delivery_method === "sms" && user.phone) {
        await sendSMS(user.phone, `Your today's Gurbani message 🙏\n${link} \n Unsubscribe: ${BASE_URL}/unsubscribe/${sub.unsubscribe_token}`);
      } else {
        deliveryStatus = "skipped";
      }

      // Log delivery
      const { error: logError } = await supabase.from("delivery_logs").insert({
        subscription_id: sub.id,
        day_number: sub.current_day,
        delivery_method: sub.delivery_method,
        delivery_status: deliveryStatus
      });

      if (logError) {
        console.error("Failed to log delivery:", logError);
      }

    } catch (err) {
      console.error("Delivery failed for subscription:", sub.id, err);

      await supabase.from("delivery_logs").insert({
        subscription_id: sub.id,
        day_number: sub.current_day,
        delivery_method: sub.delivery_method,
        delivery_status: "failed"
      });
    }
  }

  return res.json({ ok: true });
}
