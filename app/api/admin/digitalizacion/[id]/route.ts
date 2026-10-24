import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/auth'
import { advanceJob, loadJob, toJobDTO } from '@/lib/digitization/jobs'

export const dynamic = 'force-dynamic'

/** Polling del estado de un trabajo. Cada consulta avanza el trabajo un paso; nunca queda abierta esperando al proveedor. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, error } = await getAdminClient()
  if (!supabase) return NextResponse.json({ error }, { status: 403 })

  const { id } = await params
  const job = await loadJob(supabase, id)
  if (!job) return NextResponse.json({ error: 'El trabajo no existe.' }, { status: 404 })

  const advanced = await advanceJob(supabase, job)
  return NextResponse.json(await toJobDTO(supabase, advanced), { headers: { 'Cache-Control': 'no-store' } })
}
