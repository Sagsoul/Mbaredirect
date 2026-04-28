-- ============================================================
-- Mbare Direct — Deals, Edit Window & Fee Reduction (Issue #15)
-- ============================================================

-- ── 1. Profile columns ────────────────────────────────────────
-- Track how many on-platform deals each user has completed.
-- Every on-platform deal (both parties are platform users and both confirm)
-- reduces the user's next subscription fee by 2% per deal.
-- At 50 completed on-platform deals, fee_discount_pct reaches 100%,
-- granting the user a free year (subscription_expires_at extended by 1 year).
alter table profiles
  add column if not exists on_platform_deals_count int not null default 0,
  add column if not exists fee_discount_pct        numeric(5,2) not null default 0;

-- ── 2. Allow 'purchased' as a requests status ─────────────────
-- Drop the existing check constraint and recreate it with 'purchased'.
alter table requests drop constraint if exists requests_status_check;
alter table requests
  add constraint requests_status_check
  check (status in ('open', 'shortlisted', 'closed', 'purchased'));

-- ── 3. Deals table ────────────────────────────────────────────
-- A deal is initiated by the buyer (buyer_confirmed = true by default).
-- The selected seller must also confirm (seller_confirmed = true) before
-- the deal is considered complete.
-- is_outside_platform = true means the counterpart is not a platform user;
-- such deals do NOT count toward fee reductions.
create table if not exists deals (
  id                  uuid primary key default gen_random_uuid(),
  request_id          uuid references requests(id)  on delete cascade,
  -- pitch_id is null when the deal is marked as outside-platform
  pitch_id            uuid references pitches(id)   on delete set null,
  buyer_id            uuid references profiles(id)  on delete cascade,
  -- seller_id is null when is_outside_platform = true
  seller_id           uuid references profiles(id)  on delete set null,
  is_outside_platform boolean not null default false,
  -- Buyer initiates the deal, so buyer_confirmed starts as true
  buyer_confirmed     boolean not null default true,
  -- Seller must explicitly confirm on their dashboard for the deal to be valid
  seller_confirmed    boolean not null default false,
  -- Populated once both parties confirm
  completed_at        timestamptz,
  created_at          timestamptz default now()
);

alter table deals enable row level security;

-- Buyers can read deals they initiated
create policy "deals: buyers read own"
  on deals for select
  using (buyer_id = auth.uid());

-- Sellers can read deals where they are the counterpart
create policy "deals: sellers read own"
  on deals for select
  using (seller_id = auth.uid());

-- Only verified buyers can create deals
create policy "deals: buyers insert"
  on deals for insert
  with check (
    buyer_id = auth.uid()
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'buyer'
        and p.status = 'verified'
    )
  );

-- Sellers can update (confirm) deals assigned to them
create policy "deals: sellers update own"
  on deals for update
  using (seller_id = auth.uid());
