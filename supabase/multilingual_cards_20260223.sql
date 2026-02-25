-- Multilingual card fields migration (2026-02-23)
-- Apply this on existing environments.

alter table public.cards add column if not exists title_zh text;
alter table public.cards add column if not exists title_en text;
alter table public.cards add column if not exists question_zh text;
alter table public.cards add column if not exists question_en text;
alter table public.cards add column if not exists answer_zh text;
alter table public.cards add column if not exists answer_en text;
