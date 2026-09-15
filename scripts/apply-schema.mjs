#!/usr/bin/env node
// Apply sql/schema.sql to the linked Neon branch.
//
// Uses Neon's SQL-over-HTTPS endpoint rather than port 5432, because plenty of
// networks (this sandbox included) allow 443 and nothing else.
//
// The IPv4 pin is not cosmetic: Neon publishes AAAA records, and where IPv6 egress
// is unavailable undici keeps selecting it and hangs until ETIMEDOUT — even with
// --dns-result-order=ipv4first. Forcing family 4 on the dispatcher is what makes
// this work at all.
import { readFileSync } from 'node:fs'
import { Agent, setGlobalDispatcher } from 'undici'
import { neon } from '@neondatabase/serverless'

setGlobalDispatcher(new Agent({ connect: { family: 4 } }))

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set. Source .env.local, which `neon link` wrote.')
  process.exit(1)
}

const sql = neon(url)
// Split on statement-terminating semicolons, but NOT ones inside a dollar-quoted
// body -- a `do $$ ... ; ... $$` block is one statement, and a naive split on ";"
// tears it in half.
function splitStatements(sql) {
  const out = []
  let buf = ''
  let tag = null                      // the active $tag$ delimiter, if any
  for (let i = 0; i < sql.length; i++) {
    if (!tag) {
      const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i))
      if (m) { tag = m[0]; buf += tag; i += tag.length - 1; continue }
      if (sql[i] === ';') { out.push(buf); buf = ''; continue }
    } else if (sql.startsWith(tag, i)) {
      buf += tag; i += tag.length - 1; tag = null; continue
    }
    buf += sql[i]
  }
  out.push(buf)
  return out
    .map((s) => s.trim())
    .filter((s) => s && !s.split('\n').every((l) => l.trim().startsWith('--') || !l.trim()))
}

const statements = splitStatements(
  readFileSync(new URL('../sql/schema.sql', import.meta.url), 'utf8'),
)

for (const statement of statements) {
  const label = statement.replace(/\s+/g, ' ').slice(0, 58)
  try {
    await sql.query(statement)
    console.log(`  ok   ${label}`)
  } catch (e) {
    console.error(`  FAIL ${label}\n       ${e.message}`)
    process.exit(1)
  }
}
console.log(`\n${statements.length} statements applied`)
