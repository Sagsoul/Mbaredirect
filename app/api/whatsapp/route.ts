import { NextRequest, NextResponse } from 'next/server'
import { buildWhatsAppLink } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const item = searchParams.get('item')
  const location = searchParams.get('location')
  const category = searchParams.get('category')

  if (!id || !item || !location || !category) {
    return NextResponse.json({ error: 'Missing required parameters: id, item, location, category' }, { status: 400 })
  }

  const url = buildWhatsAppLink({ id, item, location, category })

  return NextResponse.json({ url })
}
