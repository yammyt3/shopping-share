create table public.keep_alive (
  id smallint primary key,
  constraint keep_alive_single_row check (id = 1)
);

comment on table public.keep_alive is
  'Single-row table read by the scheduled keep-alive request.';

insert into public.keep_alive (id) values (1);

alter table public.keep_alive enable row level security;

revoke all on table public.keep_alive from anon, authenticated;
grant select on table public.keep_alive to anon;

create policy "Allow anonymous keep-alive reads"
on public.keep_alive
for select
to anon
using (id = 1);
