create table if not exists bills (
  id bigint generated always as identity primary key,
  provider text not null,
  reference_no text not null,
  billing_month text not null,
  issue_date text,
  due_date text,
  payable_within_due_date numeric,
  payable_after_due_date numeric,
  currency text not null default 'PKR',
  units numeric,
  last_reading text,
  previous_reading text,
  customer_name text,
  customer_address text,
  charges jsonb not null default '{}'::jsonb,
  meter jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  source text,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint bills_billing_month_not_blank check (char_length(billing_month) > 0),
  constraint bills_reference_digits_check check (reference_no ~ '^[0-9]+$')
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bills_provider_reference_month_unique'
      and conrelid = 'bills'::regclass
  ) then
    alter table bills
      add constraint bills_provider_reference_month_unique
      unique (provider, reference_no, billing_month);
  end if;
end $$;
