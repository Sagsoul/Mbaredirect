-- ============================================================
-- Mbare Direct — Initial Database Schema
-- ============================================================

-- profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  status text not null default 'unverified' check (status in ('unverified','pending','verified','rejected','browser_only')),
  national_id_url text,
  selfie_url text,
  ecocash_name text,
  ecocash_ref text,
  rejection_reason text,
  reliability_score numeric(3,2) default 0,
  reliability_count int default 0,
  verified_at timestamptz,
  subscription_expires_at timestamptz,
  created_at timestamptz default now()
);

-- subscriptions
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  amount_usd numeric(10,2) not null default 10.00,
  ecocash_ref text,
  paid_at timestamptz default now(),
  expires_at timestamptz generated always as (paid_at + interval '365 days') stored,
  status text default 'pending' check (status in ('pending','confirmed','rejected'))
);

-- price_floors
create table if not exists price_floors (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  item_keyword text not null,
  min_price_usd numeric(10,2) not null,
  updated_at timestamptz default now()
);

-- requests
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references profiles(id) on delete cascade,
  category text not null check (category in ('Agriculture','Construction','Transport')),
  item text not null,
  quantity text not null,
  location text not null,
  target_budget_usd numeric(10,2) not null,
  description text,
  status text default 'open' check (status in ('open','shortlisted','closed')),
  whatsapp_views int default 0,
  created_at timestamptz default now()
);

-- pitches
create table if not exists pitches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id) on delete cascade,
  seller_id uuid references profiles(id) on delete cascade,
  price_usd numeric(10,2) not null,
  message text not null,
  status text default 'pending' check (status in ('pending','shortlisted','rejected','deal_done')),
  shortlisted_at timestamptz,
  deal_finalized_by_buyer boolean default false,
  deal_finalized_by_seller boolean default false,
  created_at timestamptz default now()
);

-- messages (only accessible when pitch is shortlisted)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  pitch_id uuid references pitches(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table price_floors enable row level security;
alter table requests enable row level security;
alter table pitches enable row level security;
alter table messages enable row level security;

-- ---------- profiles ----------
-- Users can read and update their own row
create policy "profiles: users read own"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: users update own"
  on profiles for update
  using (auth.uid() = id);

-- Admins can read all profiles
create policy "profiles: admins read all"
  on profiles for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admins can update all profiles
create policy "profiles: admins update all"
  on profiles for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Allow profile creation on sign-up
create policy "profiles: insert own"
  on profiles for insert
  with check (auth.uid() = id);

-- ---------- requests ----------
-- All users can view open requests
create policy "requests: all select"
  on requests for select
  using (true);

-- Only verified buyers can insert requests
create policy "requests: verified buyers insert"
  on requests for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'buyer'
        and p.status = 'verified'
    )
  );

-- Buyers can update their own requests
create policy "requests: buyers update own"
  on requests for update
  using (buyer_id = auth.uid());

-- ---------- pitches ----------
-- Verified sellers can insert pitches
create policy "pitches: verified sellers insert"
  on pitches for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'seller'
        and p.status = 'verified'
    )
  );

-- Buyers read pitches on their own requests
create policy "pitches: buyers read own request pitches"
  on pitches for select
  using (
    exists (
      select 1 from requests r
      where r.id = pitches.request_id
        and r.buyer_id = auth.uid()
    )
  );

-- Sellers read their own pitches
create policy "pitches: sellers read own"
  on pitches for select
  using (seller_id = auth.uid());

-- Buyers can update pitches (shortlist / deal done)
create policy "pitches: buyers update shortlist"
  on pitches for update
  using (
    exists (
      select 1 from requests r
      where r.id = pitches.request_id
        and r.buyer_id = auth.uid()
    )
  );

-- Sellers can update their own pitches (deal done)
create policy "pitches: sellers update own"
  on pitches for update
  using (seller_id = auth.uid());

-- ---------- messages ----------
-- Only accessible when pitch is shortlisted and user is buyer or seller of that pitch
create policy "messages: shortlisted pitch participants"
  on messages for select
  using (
    exists (
      select 1 from pitches pt
      join requests r on r.id = pt.request_id
      where pt.id = messages.pitch_id
        and pt.status = 'shortlisted'
        and (pt.seller_id = auth.uid() or r.buyer_id = auth.uid())
    )
  );

create policy "messages: insert by pitch participants"
  on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from pitches pt
      join requests r on r.id = pt.request_id
      where pt.id = messages.pitch_id
        and pt.status = 'shortlisted'
        and (pt.seller_id = auth.uid() or r.buyer_id = auth.uid())
    )
  );

-- ---------- subscriptions ----------
create policy "subscriptions: users read own"
  on subscriptions for select
  using (user_id = auth.uid());

create policy "subscriptions: users insert own"
  on subscriptions for insert
  with check (user_id = auth.uid());

create policy "subscriptions: admins all"
  on subscriptions for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ---------- price_floors ----------
-- Anyone can read price floors
create policy "price_floors: all select"
  on price_floors for select
  using (true);

-- Only admins can modify price floors
create policy "price_floors: admins all"
  on price_floors for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================================
-- Seed example price floors
-- ============================================================
insert into price_floors (category, item_keyword, min_price_usd) values
  ('Agriculture', 'maize', 18.00),
  ('Agriculture', 'soya', 22.00),
  ('Agriculture', 'fertiliser', 25.00),
  ('Construction', 'cement', 12.00),
  ('Construction', 'bricks', 80.00),
  ('Construction', 'steel', 150.00),
  ('Transport', 'truck', 200.00),
  ('Transport', 'haulage', 150.00)
on conflict do nothing;
