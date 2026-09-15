import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'

// Canned upstream. Shape matters; logic does not.
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!req.headers.authorization) return res.status(401).json({ error: 'Unauthorized' })

  const { session_id } = req.body ?? {}
  if (!session_id) return res.status(400).json({ error: 'Bad request' })

  return res.status(200).json({ success: true, req_id: randomUUID() })
}
