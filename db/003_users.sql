create table if not exists users (
  uid text primary key,
  name text not null,
  email text not null,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_name_length_check check (char_length(name) <= 80),
  constraint users_email_length_check check (char_length(email) <= 200),
  constraint users_city_length_check check (city is null or char_length(city) <= 80)
);
