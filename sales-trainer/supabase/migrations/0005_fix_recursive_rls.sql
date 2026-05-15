-- ============================================================
-- 0005_fix_recursive_rls.sql
-- Corrige recursão nas policies de RLS que consultavam profiles
-- ============================================================

-- Helpers security definer evitam que uma policy precise consultar
-- public.profiles passando pela própria RLS de profiles.
create or replace function public.current_user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.current_user_is_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and organization_id = target_organization_id
  )
$$;

-- ============================================================
-- profiles
-- ============================================================

drop policy if exists "users can read own profile" on public.profiles;
drop policy if exists "admins read org profiles" on public.profiles;
drop policy if exists "users can update own profile" on public.profiles;
drop policy if exists "admins update org profiles" on public.profiles;
drop policy if exists "users can insert own profile" on public.profiles;

create policy "users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "admins read org profiles"
  on public.profiles for select
  using (public.current_user_is_admin(organization_id));

create policy "users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "admins update org profiles"
  on public.profiles for update
  using (public.current_user_is_admin(organization_id));

create policy "users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- ============================================================
-- organizations
-- ============================================================

drop policy if exists "members read own org" on public.organizations;

create policy "members read own org"
  on public.organizations for select
  using (id = public.current_user_organization_id());

-- ============================================================
-- customer_profiles
-- ============================================================

drop policy if exists "sellers read active profiles" on public.customer_profiles;
drop policy if exists "admins read all profiles" on public.customer_profiles;
drop policy if exists "admins insert profiles" on public.customer_profiles;
drop policy if exists "admins update profiles" on public.customer_profiles;
drop policy if exists "admins delete profiles" on public.customer_profiles;

create policy "sellers read active profiles"
  on public.customer_profiles for select
  using (
    is_active = true
    and organization_id = public.current_user_organization_id()
  );

create policy "admins read all profiles"
  on public.customer_profiles for select
  using (public.current_user_is_admin(organization_id));

create policy "admins insert profiles"
  on public.customer_profiles for insert
  with check (public.current_user_is_admin(organization_id));

create policy "admins update profiles"
  on public.customer_profiles for update
  using (public.current_user_is_admin(organization_id));

create policy "admins delete profiles"
  on public.customer_profiles for delete
  using (public.current_user_is_admin(organization_id));

-- ============================================================
-- training_sessions
-- ============================================================

drop policy if exists "sellers see own sessions" on public.training_sessions;
drop policy if exists "admins see org sessions" on public.training_sessions;
drop policy if exists "sellers insert own sessions" on public.training_sessions;
drop policy if exists "sellers update own sessions" on public.training_sessions;
drop policy if exists "admins update org sessions" on public.training_sessions;

create policy "sellers see own sessions"
  on public.training_sessions for select
  using (seller_id = auth.uid());

create policy "admins see org sessions"
  on public.training_sessions for select
  using (public.current_user_is_admin(organization_id));

create policy "sellers insert own sessions"
  on public.training_sessions for insert
  with check (
    seller_id = auth.uid()
    and organization_id = public.current_user_organization_id()
  );

create policy "sellers update own sessions"
  on public.training_sessions for update
  using (seller_id = auth.uid());

create policy "admins update org sessions"
  on public.training_sessions for update
  using (public.current_user_is_admin(organization_id));

-- ============================================================
-- messages
-- ============================================================

drop policy if exists "users see messages of accessible sessions" on public.messages;
drop policy if exists "sellers insert messages" on public.messages;

create policy "users see messages of accessible sessions"
  on public.messages for select
  using (
    exists (
      select 1
      from public.training_sessions ts
      where ts.id = messages.session_id
        and (
          ts.seller_id = auth.uid()
          or public.current_user_is_admin(ts.organization_id)
        )
    )
  );

create policy "sellers insert messages"
  on public.messages for insert
  with check (
    exists (
      select 1
      from public.training_sessions ts
      where ts.id = messages.session_id
        and ts.seller_id = auth.uid()
        and ts.status = 'active'
    )
  );

-- ============================================================
-- session_feedback
-- ============================================================

drop policy if exists "users read accessible feedback" on public.session_feedback;

create policy "users read accessible feedback"
  on public.session_feedback for select
  using (
    exists (
      select 1
      from public.training_sessions ts
      where ts.id = session_feedback.session_id
        and (
          ts.seller_id = auth.uid()
          or public.current_user_is_admin(ts.organization_id)
        )
    )
  );
