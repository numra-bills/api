create table if not exists meter_readings (
  id bigint generated always as identity primary key,
  uid text not null,
  account_id bigint not null references saved_accounts (id) on delete cascade,
  reading numeric not null,
  entered_at timestamptz not null default now(),
  constraint meter_readings_reading_check check (reading >= 0)
);

create index if not exists meter_readings_account_id_idx
  on meter_readings (account_id, entered_at desc, id desc);
