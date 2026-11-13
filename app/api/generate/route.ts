import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { generate, type Strategy } from '../../../lib/lottery';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  const body = await req.json().catch(()=>({}));
  const strategy: Strategy = ['equilibree','frequence','affinites','aleatoire'].includes(body.strategy) ? body.strategy : 'equilibree';
  const result = generate(strategy);
  let saved = false;
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      await sql`INSERT INTO generated_combinations (numbers, strategy, score, user_agent) VALUES (${result.numbers}, ${strategy}, ${result.score}, ${req.headers.get('user-agent')?.slice(0,500) ?? null})`;
      saved = true;
    } catch (e) { console.error('Neon logging skipped:', e); }
  }
  return NextResponse.json({...result, saved});
}
