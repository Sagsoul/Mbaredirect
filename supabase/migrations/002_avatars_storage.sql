-- Add avatar_url column to profiles (safe to run on existing data)
alter table profiles add column if not exists avatar_url text;

-- Create avatars storage bucket (public)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatar
create policy "avatars: users upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update their own avatar
create policy "avatars: users update own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read for avatars
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');
