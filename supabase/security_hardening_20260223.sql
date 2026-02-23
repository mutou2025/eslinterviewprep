-- Security hardening migration (2026-02-23)
-- Apply this in Supabase SQL Editor for existing projects.

-- Categories / Cards: require authenticated users to read.
drop policy if exists "Categories: public read" on public.categories;
drop policy if exists "Categories: authenticated read" on public.categories;
create policy "Categories: authenticated read" on public.categories
for select using (auth.role() = 'authenticated');

drop policy if exists "Cards: public read" on public.cards;
drop policy if exists "Cards: authenticated read" on public.cards;
create policy "Cards: authenticated read" on public.cards
for select using (auth.role() = 'authenticated');

-- Labour tables: require authenticated users to read.
drop policy if exists "Labour Companies: public read" on public.labour_companies;
drop policy if exists "Labour Companies: authenticated read" on public.labour_companies;
create policy "Labour Companies: authenticated read" on public.labour_companies
for select using (auth.role() = 'authenticated');

drop policy if exists "Labour Questions: public read" on public.labour_questions;
drop policy if exists "Labour Questions: authenticated read" on public.labour_questions;
create policy "Labour Questions: authenticated read" on public.labour_questions
for select using (auth.role() = 'authenticated');
