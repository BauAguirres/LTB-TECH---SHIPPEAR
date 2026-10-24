-- El primer usuario que se registra queda como administrador, solo si todavía no existe ninguno.
-- El advisory lock evita que dos registros simultáneos creen dos administradores.
create or replace function public.bootstrap_first_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('bootstrap_first_admin'));
  if not exists (select 1 from public.admin_users) then
    insert into public.admin_users (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end; $$;

revoke all on function public.bootstrap_first_admin() from public, anon, authenticated;

drop trigger if exists on_auth_user_bootstrap_admin on auth.users;
create trigger on_auth_user_bootstrap_admin after insert on auth.users
  for each row execute function public.bootstrap_first_admin();
