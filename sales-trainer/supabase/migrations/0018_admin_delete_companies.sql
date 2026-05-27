-- Permite que admins excluam empresas da própria organização
create policy "admins delete org companies"
  on public.scenario_companies for delete
  using (public.current_user_is_admin(organization_id));
