-- Permite que admins excluam sessões da própria organização
create policy "admins delete org sessions"
  on public.training_sessions for delete
  using (public.current_user_is_admin(organization_id));
