create table if not exists provider_requests (
  id bigint generated always as identity primary key,
  uid text not null,
  provider_name text not null,
  utility text not null,
  city text,
  notes text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint provider_requests_name_length_check check (char_length(provider_name) between 1 and 80),
  constraint provider_requests_utility_check check (utility in ('electricity', 'gas', 'water', 'internet', 'other')),
  constraint provider_requests_city_length_check check (city is null or char_length(city) <= 80),
  constraint provider_requests_notes_length_check check (notes is null or char_length(notes) <= 500),
  constraint provider_requests_status_check check (status in ('open', 'added'))
);

create index if not exists provider_requests_uid_idx
  on provider_requests (uid, id desc);
