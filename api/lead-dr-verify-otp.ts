import type { VercelRequest, VercelResponse } from '@vercel/node'

// Accepts 000000 and nothing else, so the funnel has a deterministic happy path
// and a deterministic failure path for the failure-path analytics assertion.
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' })

  const { session_id, otp } = req.body ?? {}
  if (!session_id || !otp) return res.status(400).json({ error: 'Bad request' })

  if (otp !== '000000') return res.status(401).json({ success: false, reason: 'invalid_code' })
  return res.status(200).json({ success: true, verified: true })
}
