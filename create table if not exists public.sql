create table if not exists public.waitlist (
  id bigserial primary key,
  ts timestamptz not null default now(),
  email text not null,
  name text,
  note text,
  consent boolean default false,
  utm jsonb default '{}'::jsonb,
  tz text,
  ua text,
  ip text
);

create unique index if not exists waitlist_email_uidx on public.waitlist (lower(email));

alter table public.waitlist enable row level security;
