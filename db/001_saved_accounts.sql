create table if not exists saved_accounts (
  id bigint generated always as identity primary key,
  uid text not null,
  provider text not null,
  reference_no text not null,
  category text not null,
  tag text,
  created_at timestamptz not null default now(),
  constraint saved_accounts_category_check check (category in ('Home', 'Office', 'Shop', 'Other')),
  constraint saved_accounts_reference_digits_check check (reference_no ~ '^[0-9]+$'),
  constraint saved_accounts_tag_length_check check (tag is null or char_length(tag) <= 16)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'saved_accounts_uid_provider_reference_unique'
      and conrelid = 'saved_accounts'::regclass
  ) then
    alter table saved_accounts
      add constraint saved_accounts_uid_provider_reference_unique
      unique (uid, provider, reference_no);
  end if;
end $$;
