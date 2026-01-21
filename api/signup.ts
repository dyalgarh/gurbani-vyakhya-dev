// /api/free-signup.ts
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL! ,
  process.env.SUPABASE_PUBLISHABLE_KEY!
)

export default async function handler(req: any, res: any) {
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL)
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const { path_id, name, email, phone, delivery_method } = req.body

  if (!path_id || !name) {
    return res.status(400).json({ success: false, message: 'Missing required fields' })
  }

  if (!email && !phone) {
    return res.status(400).json({ success: false, message: 'Email or phone required' })
  }

  // 1. Create or fetch user
  const { data: user, error: userError } = await supabase
    .from('users')
    .upsert(
      { name, email, phone },
      { onConflict: email ? 'email' : 'phone' }
    )
    .select()
    .single()

  if (userError) {
    return res.status(500).json({ success: false, message: 'User creation failed' })
  }

  // 2. Create subscription
  const startDate = new Date()
  startDate.setDate(startDate.getDate() + 1)
  const secureToken = crypto.randomUUID()

  const { error: subError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: user.id,
      path_id,
      delivery_method,
      is_paid: false,
      status: 'active',
      current_day : 0,
      secure_token: secureToken,
      start_date: startDate.toISOString().split('T')[0]
    })

  if (subError) {
    return res.status(400).json({ success: false, message: 'Already subscribed or error' })
  }

  return res.json({
    success: true,
    message: 'Subscription created. You will start receiving reflections from tomorrow.'
  })
}
