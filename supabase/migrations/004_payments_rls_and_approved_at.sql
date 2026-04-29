-- ============================================================
-- Mbare Direct — Payments RLS & approved_at column
-- ============================================================

-- ── 1. Add approved_at column ─────────────────────────────────
-- Required by approvePayment() in app/admin/AdminDashboardClient.tsx
alter table payments
  add column if not exists approved_at timestamptz;

-- ── 2. Enable Row Level Security ──────────────────────────────
alter table payments enable row level security;

-- ── 3. Drop existing policies (makes migration re-runnable) ───
drop policy if exists "payments: users insert own"  on payments;
drop policy if exists "payments: users read own"    on payments;
drop policy if exists "payments: admins read all"   on payments;
drop policy if exists "payments: admins update all" on payments;

-- ── 4. User policies ──────────────────────────────────────────
-- Users can insert their own payment rows
create policy "payments: users insert own"
  on payments for insert
  with check (user_id = auth.uid());

-- Users can read their own payment rows
create policy "payments: users read own"
  on payments for select
  using (user_id = auth.uid());

-- ── 5. Admin policies ─────────────────────────────────────────
-- Admins can read all payments (fixes admin dashboard visibility)
create policy "payments: admins read all"
  on payments for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admins can update all payments (needed for approve/reject actions)
create policy "payments: admins update all"
  on payments for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
