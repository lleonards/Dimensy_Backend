create extension if not exists pgcrypto;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text not null default '',
  city text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  business_hours text not null default '',
  response_time_hours integer not null default 6 check (response_time_hours in (2,6,12,24)),
  intro_message text not null default '',
  primary_color text not null default '#0f172a',
  secondary_color text not null default '#22c55e',
  logo_path text not null default '',
  cover_path text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  example_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_name text not null,
  whatsapp text not null,
  city text not null,
  category_id uuid references public.categories(id) on delete set null,
  category_name text not null,
  summary text not null,
  details text not null default '',
  source text not null default 'landing_page',
  status text not null default 'novo' check (status in ('novo','em_atendimento','concluido','descartado')),
  first_contact_at timestamptz,
  completed_at timestamptz,
  discarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  event_label text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  expiration_time text,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_app_settings on public.app_settings;
create trigger set_updated_at_app_settings before update on public.app_settings for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_companies on public.companies;
create trigger set_updated_at_companies before update on public.companies for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_categories on public.categories;
create trigger set_updated_at_categories before update on public.categories for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_leads on public.leads;
create trigger set_updated_at_leads before update on public.leads for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_push_subscriptions on public.push_subscriptions;
create trigger set_updated_at_push_subscriptions before update on public.push_subscriptions for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.categories enable row level security;
alter table public.leads enable row level security;
alter table public.lead_history enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "companies_owner" on public.companies;
create policy "companies_owner" on public.companies for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "categories_owner" on public.categories;
create policy "categories_owner" on public.categories for all using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())) with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));
drop policy if exists "leads_owner" on public.leads;
create policy "leads_owner" on public.leads for all using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())) with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));
drop policy if exists "lead_history_owner" on public.lead_history;
create policy "lead_history_owner" on public.lead_history for all using (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid())) with check (exists (select 1 from public.companies c where c.id = company_id and c.owner_id = auth.uid()));
drop policy if exists "push_subscriptions_owner" on public.push_subscriptions;
create policy "push_subscriptions_owner" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists "branding_upload_own_folder" on storage.objects;
create policy "branding_upload_own_folder" on storage.objects
for insert to authenticated
with check (bucket_id = 'branding' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));

drop policy if exists "branding_update_own_folder" on storage.objects;
create policy "branding_update_own_folder" on storage.objects
for update to authenticated
using (bucket_id = 'branding' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'))
with check (bucket_id = 'branding' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));

drop policy if exists "branding_delete_own_folder" on storage.objects;
create policy "branding_delete_own_folder" on storage.objects
for delete to authenticated
using (bucket_id = 'branding' and (storage.foldername(name))[1] = (select auth.jwt()->>'sub'));
