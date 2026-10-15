create table public.clinic_state (
 id integer primary key check (id = 1),
 revision bigint not null default 0,
 body jsonb
);
alter table public.clinic_state enable row level security;
revoke all on public.clinic_state from anon, authenticated;
grant select, update on public.clinic_state to service_role;
insert into public.clinic_state(id) values (1);
create function public.haoyue_cas(p_revision bigint,p_body jsonb) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
 update public.clinic_state set body=p_body, revision=revision+1 where id=1 and revision=p_revision;
 return found;
end;
$$;
revoke all on function public.haoyue_cas(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.haoyue_cas(bigint,jsonb) to service_role;
