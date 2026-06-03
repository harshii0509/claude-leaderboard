create table if not exists public.user_widget_settings (
  user_id uuid primary key references next_auth.users(id) on delete cascade,
  public_id text not null unique,
  is_published boolean not null default false,
  preset text not null default 'arcade',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_widget_settings_public_id_idx
  on public.user_widget_settings (public_id);

alter table public.user_widget_settings enable row level security;

drop policy if exists "deny all user widget settings" on public.user_widget_settings;
create policy "deny all user widget settings"
on public.user_widget_settings
for all
using (false)
with check (false);
