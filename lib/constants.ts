/**
 * Statuses that prevent a user from accessing the dashboard.
 * Must stay in sync with the `status` check constraint in the database schema
 * (supabase/migrations/001_initial_schema.sql).
 */
export const DASHBOARD_BLOCKED_STATUSES = [
  'unverified',
  'pending',
  'browser_only',
  'rejected',
] as const

export type UserStatus = 'unverified' | 'pending' | 'verified' | 'rejected' | 'browser_only'
export type UserRole = 'buyer' | 'seller' | 'admin'

export const SUBSCRIPTION_DURATION_DAYS = 365
