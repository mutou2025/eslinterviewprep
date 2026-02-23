-- Labour Interview Schema for interview-flashcards
-- Run this script in Supabase SQL Editor

-- Labour Companies (公司列表)
create table if not exists public.labour_companies (
    id text primary key,
    name text not null,
    logo_url text,
    created_at timestamptz not null default now()
);

alter table public.labour_companies add column if not exists name text;
alter table public.labour_companies add column if not exists logo_url text;
alter table public.labour_companies add column if not exists created_at timestamptz not null default now();

-- Labour Questions (面试题库)
create table if not exists public.labour_questions (
    id uuid primary key default gen_random_uuid(),
    company_id text not null references public.labour_companies on delete cascade,
    question text not null,
    answer text,
    tags text[] not null default '{}',
    submitted_by uuid references auth.users on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.labour_questions add column if not exists company_id text;
alter table public.labour_questions add column if not exists question text;
alter table public.labour_questions add column if not exists answer text;
alter table public.labour_questions add column if not exists tags text[] not null default '{}';
alter table public.labour_questions add column if not exists submitted_by uuid;
alter table public.labour_questions add column if not exists created_at timestamptz not null default now();
alter table public.labour_questions add column if not exists updated_at timestamptz not null default now();

-- Enable RLS
alter table public.labour_companies enable row level security;
alter table public.labour_questions enable row level security;

-- Labour Companies policies: authenticated read, admin write
drop policy if exists "Labour Companies: public read" on public.labour_companies;
drop policy if exists "Labour Companies: authenticated read" on public.labour_companies;
create policy "Labour Companies: authenticated read" on public.labour_companies
for select using (auth.role() = 'authenticated');

drop policy if exists "Labour Companies: admin write" on public.labour_companies;
create policy "Labour Companies: admin write" on public.labour_companies
for all using (public.is_admin()) with check (public.is_admin());

-- Labour Questions policies: authenticated read, admin write
drop policy if exists "Labour Questions: public read" on public.labour_questions;
drop policy if exists "Labour Questions: authenticated read" on public.labour_questions;
create policy "Labour Questions: authenticated read" on public.labour_questions
for select using (auth.role() = 'authenticated');

drop policy if exists "Labour Questions: admin write" on public.labour_questions;
create policy "Labour Questions: admin write" on public.labour_questions
for all using (public.is_admin()) with check (public.is_admin());

-- Indexes
create index if not exists idx_labour_questions_company on public.labour_questions (company_id);

-- Seed initial companies
insert into public.labour_companies (id, name) values
    ('canada-post', 'Canada Post'),
    ('lifelabs', 'LifeLabs'),
    ('purolator', 'Purolator'),
    ('fedex', 'FedEx')
on conflict (id) do nothing;
