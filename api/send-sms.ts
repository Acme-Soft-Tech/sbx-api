import type { VercelRequest, VercelResponse } from '@vercel/node'
import pg from 'pg'

// The SMS stub — and the second half of the rig's defence in depth.
//
// sms-guard.sh inspects COMMAND TEXT, so an agent that writes a script and executes it
// routes around it without ever intending to. This endpoint therefore refuses to write
// unless the deployment explicitly opts in. A guard that fails open still produces no
// message, which is the property that actually matters.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (process.env.SBX_ALLOW_SMS !== '1') {
    return res.status(403).json({
      error: 'SMS sending is disabled on this deployment',
      hint: 'set SBX_ALLOW_SMS=1 — deliberately, and only for an e2e run',
    })
  }

  const { to_number, body, run_id } = req.body ?? {}
  if (!to_number || !body) return res.status(400).json({ error: 'Bad request' })

  const client = new pg.Client({ connectionString: process.env.SBX_DB_URL })
  try {
    await client.connect()
    const { rows } = await client.query(
      'insert into sent_messages (to_number, body, run_id) values ($1, $2, $3) returning id, sent_at',
      [to_number, body, run_id ?? null],
    )
    return res.status(200).json({ success: true, ...rows[0] })
  } catch {
    // No upstream text to the client, ever.
    return res.status(500).json({ error: 'Something went wrong' })
  } finally {
    await client.end().catch(() => {})
  }
}
