create extension if not exists pgcrypto;

create table public.shared_lists (
  id uuid primary key default gen_random_uuid(),
  share_token text unique not null default encode(extensions.gen_random_bytes(18), 'hex'),
  title text not null default '今回の買い物',
  items jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  constraint shared_lists_items_array check (jsonb_typeof(items) = 'array')
);

alter table public.shared_lists enable row level security;

create or replace function public.create_shared_list(p_items jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare new_token text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 200 then
    raise exception 'invalid shopping list';
  end if;
  insert into public.shared_lists (items) values (p_items) returning share_token into new_token;
  return new_token;
end;
$$;

create or replace function public.get_shared_list(p_token text)
returns table (title text, items jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select s.title, s.items, s.updated_at
  from public.shared_lists s
  where s.share_token = p_token and s.expires_at > now();
$$;

create or replace function public.set_shared_item_checked(p_token text, p_item_id text, p_checked boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare updated_items jsonb;
begin
  update public.shared_lists s
  set items = (
    select jsonb_agg(
      case when elem->>'id' = p_item_id
        then jsonb_set(elem, '{checked}', to_jsonb(p_checked))
        else elem end
    ) from jsonb_array_elements(s.items) elem
  ), updated_at = now()
  where s.share_token = p_token and s.expires_at > now()
  returning s.items into updated_items;
  return updated_items;
end;
$$;

revoke all on public.shared_lists from anon, authenticated;
grant execute on function public.create_shared_list(jsonb) to anon, authenticated;
grant execute on function public.get_shared_list(text) to anon, authenticated;
grant execute on function public.set_shared_item_checked(text, text, boolean) to anon, authenticated;
