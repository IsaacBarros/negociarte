alter table public.customer_profiles
  add column if not exists chat_model varchar(100) default null;
