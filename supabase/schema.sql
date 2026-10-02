-- Run once in the Supabase SQL editor. Public users can read, never write.
create table if not exists public.matches (
  id text primary key check (id = 'school-match'),
  revision integer not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  operation_id uuid
);
alter table public.matches enable row level security;
drop policy if exists "Public scoreboard read" on public.matches;
create policy "Public scoreboard read" on public.matches for select to anon, authenticated using (true);
grant select on public.matches to anon, authenticated;
revoke insert, update, delete on public.matches from anon, authenticated;
-- One atomic compare-and-swap. Repeated requests with the same operation ID are safe.
create or replace function public.save_match(p_data jsonb, p_revision integer, p_operation uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_row public.matches; result public.matches;
begin
  perform pg_advisory_xact_lock(817264);
  select * into current_row from public.matches where id = 'school-match';
  if found then
    if current_row.operation_id = p_operation then return to_jsonb(current_row); end if;
    if current_row.revision <> p_revision then raise exception 'CONFLICT'; end if;
    update public.matches set data = p_data, revision = revision + 1,
      operation_id = p_operation, updated_at = now() where id = 'school-match' returning * into result;
  else
    if p_revision <> 0 then raise exception 'CONFLICT'; end if;
    insert into public.matches(id,data,revision,operation_id) values('school-match',p_data,1,p_operation) returning * into result;
  end if;
  return to_jsonb(result);
end;
$$;
revoke all on function public.save_match(jsonb,integer,uuid) from public, anon, authenticated;
grant execute on function public.save_match(jsonb,integer,uuid) to service_role;
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='matches' and schemaname='public') then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;
