-- Supabase schema for interview-flashcards

create extension if not exists "pgcrypto";

-- NOTE:
-- This script is idempotent and safe to re-run for additive schema changes.
-- For destructive changes (dropping columns, renaming columns, or type changes),
-- apply a manual migration.

-- Profiles
create table if not exists public.profiles (
    id uuid primary key references auth.users on delete cascade,
    email text,
    display_name text,
    role text not null default 'user',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Categories
create table if not exists public.categories (
    id text primary key,
    level int not null,
    name text not null,
    name_en text,
    parent_id text,
    icon text
);

alter table public.categories add column if not exists level int;
alter table public.categories add column if not exists name text;
alter table public.categories add column if not exists name_en text;
alter table public.categories add column if not exists parent_id text;
alter table public.categories add column if not exists icon text;

-- Cards (public question bank)
create table if not exists public.cards (
    id text primary key,
    source text not null,
    upstream_source text,
    category_l1_id text not null,
    category_l2_id text not null,
    category_l3_id text not null,
    title text not null,
    question text not null,
    answer text,
    question_type text not null,
    difficulty text not null,
    frequency text not null,
    custom_tags text[] not null default '{}',
    code_template text,
    test_cases jsonb,
    entry_function_name text,
    supported_languages text[],
    origin_upstream_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.cards add column if not exists source text;
alter table public.cards add column if not exists upstream_source text;
alter table public.cards add column if not exists category_l1_id text;
alter table public.cards add column if not exists category_l2_id text;
alter table public.cards add column if not exists category_l3_id text;
alter table public.cards add column if not exists title text;
alter table public.cards add column if not exists question text;
alter table public.cards add column if not exists answer text;
alter table public.cards add column if not exists question_type text;
alter table public.cards add column if not exists difficulty text;
alter table public.cards add column if not exists frequency text;
alter table public.cards add column if not exists custom_tags text[] not null default '{}';
alter table public.cards add column if not exists code_template text;
alter table public.cards add column if not exists test_cases jsonb;
alter table public.cards add column if not exists entry_function_name text;
alter table public.cards add column if not exists supported_languages text[];
alter table public.cards add column if not exists origin_upstream_id text;
alter table public.cards add column if not exists created_at timestamptz not null default now();
alter table public.cards add column if not exists updated_at timestamptz not null default now();

-- User overrides (learning status)
create table if not exists public.card_overrides (
    user_id uuid not null references auth.users on delete cascade,
    card_id text not null references public.cards on delete cascade,
    mastery text not null default 'new',
    review_count int not null default 0,
    interval_days int not null default 0,
    due_at timestamptz not null default now(),
    last_reviewed_at timestamptz,
    last_submission_code text,
    pass_rate numeric,
    updated_at timestamptz not null default now(),
    primary key (user_id, card_id)
);

alter table public.card_overrides add column if not exists mastery text not null default 'new';
alter table public.card_overrides add column if not exists review_count int not null default 0;
alter table public.card_overrides add column if not exists interval_days int not null default 0;
alter table public.card_overrides add column if not exists due_at timestamptz not null default now();
alter table public.card_overrides add column if not exists last_reviewed_at timestamptz;
alter table public.card_overrides add column if not exists last_submission_code text;
alter table public.card_overrides add column if not exists pass_rate numeric;
alter table public.card_overrides add column if not exists updated_at timestamptz not null default now();

-- User lists
create table if not exists public.card_lists (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users on delete cascade,
    name text not null,
    card_ids text[] not null default '{}',
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.card_lists add column if not exists user_id uuid;
alter table public.card_lists add column if not exists name text;
alter table public.card_lists add column if not exists card_ids text[] not null default '{}';
alter table public.card_lists add column if not exists is_default boolean not null default false;
alter table public.card_lists add column if not exists created_at timestamptz not null default now();
alter table public.card_lists add column if not exists updated_at timestamptz not null default now();

-- Review sessions
create table if not exists public.review_sessions (
    id text primary key,
    user_id uuid not null references auth.users on delete cascade,
    scope text not null,
    mode text not null,
    queue_card_ids text[] not null default '{}',
    cursor int not null default 0,
    filters jsonb not null,
    updated_at timestamptz not null default now()
);

alter table public.review_sessions add column if not exists user_id uuid;
alter table public.review_sessions add column if not exists scope text;
alter table public.review_sessions add column if not exists mode text;
alter table public.review_sessions add column if not exists queue_card_ids text[] not null default '{}';
alter table public.review_sessions add column if not exists cursor int not null default 0;
alter table public.review_sessions add column if not exists filters jsonb not null;
alter table public.review_sessions add column if not exists updated_at timestamptz not null default now();

-- Review logs
create table if not exists public.review_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users on delete cascade,
    card_id text not null references public.cards on delete cascade,
    reviewed_at timestamptz not null default now(),
    previous_mastery text not null,
    new_mastery text not null,
    did_reveal_answer boolean not null default true,
    time_spent_ms int not null default 0
);

alter table public.review_logs add column if not exists user_id uuid;
alter table public.review_logs add column if not exists card_id text;
alter table public.review_logs add column if not exists reviewed_at timestamptz not null default now();
alter table public.review_logs add column if not exists previous_mastery text;
alter table public.review_logs add column if not exists new_mastery text;
alter table public.review_logs add column if not exists did_reveal_answer boolean not null default true;
alter table public.review_logs add column if not exists time_spent_ms int not null default 0;

-- Subscriptions
create table if not exists public.subscriptions (
    user_id uuid primary key references auth.users on delete cascade,
    status text not null default 'free',
    plan text,
    current_period_end timestamptz,
    updated_at timestamptz not null default now()
);

alter table public.subscriptions add column if not exists status text not null default 'free';
alter table public.subscriptions add column if not exists plan text;
alter table public.subscriptions add column if not exists current_period_end timestamptz;
alter table public.subscriptions add column if not exists updated_at timestamptz not null default now();

-- User settings (preferences)
create table if not exists public.user_settings (
    user_id uuid primary key references auth.users on delete cascade,
    review_mode text not null default 'qa',
    daily_reminder boolean not null default false,
    language text not null default 'zh-CN',
    updated_at timestamptz not null default now()
);

alter table public.user_settings add column if not exists review_mode text not null default 'qa';
alter table public.user_settings add column if not exists daily_reminder boolean not null default false;
alter table public.user_settings add column if not exists language text not null default 'zh-CN';
alter table public.user_settings add column if not exists updated_at timestamptz not null default now();

-- Helper: is_admin
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    return exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    );
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.cards enable row level security;
alter table public.card_overrides enable row level security;
alter table public.card_lists enable row level security;
alter table public.review_sessions enable row level security;
alter table public.review_logs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_settings enable row level security;

-- Profiles policies
drop policy if exists "Profiles: select own or admin" on public.profiles;
create policy "Profiles: select own or admin" on public.profiles
for select using (auth.uid() = id or public.is_admin());

drop policy if exists "Profiles: update own or admin" on public.profiles;
create policy "Profiles: update own or admin" on public.profiles
for update using (auth.uid() = id or public.is_admin());

drop policy if exists "Profiles: insert self" on public.profiles;
create policy "Profiles: insert self" on public.profiles
for insert with check (auth.uid() = id);

-- Categories policies
drop policy if exists "Categories: public read" on public.categories;
create policy "Categories: public read" on public.categories
for select using (true);

drop policy if exists "Categories: admin write" on public.categories;
create policy "Categories: admin write" on public.categories
for all using (public.is_admin()) with check (public.is_admin());

-- Cards policies
drop policy if exists "Cards: public read" on public.cards;
create policy "Cards: public read" on public.cards
for select using (true);

drop policy if exists "Cards: admin write" on public.cards;
create policy "Cards: admin write" on public.cards
for all using (public.is_admin()) with check (public.is_admin());

-- User tables policies
drop policy if exists "Overrides: own rows" on public.card_overrides;
create policy "Overrides: own rows" on public.card_overrides
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Lists: own rows" on public.card_lists;
create policy "Lists: own rows" on public.card_lists
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Sessions: own rows" on public.review_sessions;
create policy "Sessions: own rows" on public.review_sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Logs: own rows" on public.review_logs;
create policy "Logs: own rows" on public.review_logs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Subscriptions: own rows" on public.subscriptions;
create policy "Subscriptions: own rows" on public.subscriptions
for select using (auth.uid() = user_id);

drop policy if exists "Subscriptions: admin write" on public.subscriptions;
create policy "Subscriptions: admin write" on public.subscriptions
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Settings: own rows" on public.user_settings;
create policy "Settings: own rows" on public.user_settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, display_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', new.email));
    insert into public.user_settings (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Indexes
create index if not exists idx_cards_category_l3 on public.cards (category_l3_id);
create index if not exists idx_overrides_user_due on public.card_overrides (user_id, due_at);
create index if not exists idx_logs_user_reviewed on public.review_logs (user_id, reviewed_at);
