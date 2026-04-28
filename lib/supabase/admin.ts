import { createClient as createServerClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client — bypasses Row Level Security.
 * Use ONLY in server-side code (API routes, Server Actions) for operations
 * that legitimately need to update data across multiple users, such as
 * applying fee discounts after a deal is confirmed by both parties.
 * Never expose the service role key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service-role environment variables')
  }

  return createServerClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}
