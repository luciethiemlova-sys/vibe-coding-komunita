-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  name text not null,
  bio text,
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);

-- Private contact info (Admin + Owner only)
create table private_contacts (
  id uuid references profiles(id) on delete cascade not null primary key,
  email text unique not null,
  phone text,
  consent_given boolean default false,
  consent_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- events table
create table events (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  venue text default 'Sbeerka, Ostrava-Poruba',
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- date_options table
create table date_options (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade not null,
  label text not null,
  created_at timestamp with time zone default now()
);

-- topics table
create table topics (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade not null,
  text text not null,
  author_id uuid references profiles(id) not null,
  created_at timestamp with time zone default now()
);

-- topic_votes join table
create table topic_votes (
  topic_id uuid references topics(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  primary key (topic_id, profile_id)
);

-- date_votes join table
create table date_votes (
  date_option_id uuid references date_options(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  primary key (date_option_id, profile_id)
);

-- RLS Policies

-- Profiles: public read, owner update
alter table profiles enable row level security;
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Private contacts: only owner or admin can read/update
alter table private_contacts enable row level security;
create policy "Users can see own contact info" on private_contacts for select using (auth.uid() = id);
create policy "Admins can see all contact info" on private_contacts for select using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);
create policy "Users can update own contact info" on private_contacts for update using (auth.uid() = id);

-- Events: public read, admin write
alter table events enable row level security;
create policy "Events are viewable by everyone" on events for select using (true);
create policy "Admins can manage events" on events for all using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Topics: public read, authenticated write, owner delete
alter table topics enable row level security;
create policy "Topics are viewable by everyone" on topics for select using (true);
create policy "Authenticated users can create topics" on topics for insert with check (auth.role() = 'authenticated');
create policy "Users can delete own topics" on topics for delete using (auth.uid() = author_id);

-- Votes: public read counts, authenticated write own vote
alter table topic_votes enable row level security;
create policy "Topic votes are viewable by everyone" on topic_votes for select using (true);
create policy "Users can vote once per topic" on topic_votes for insert with check (auth.uid() = profile_id);
create policy "Users can remove own vote" on topic_votes for delete using (auth.uid() = profile_id);

alter table date_votes enable row level security;
create policy "Date votes are viewable by everyone" on date_votes for select using (true);
create policy "Users can vote once per date" on date_votes for insert with check (auth.uid() = profile_id);
create policy "Users can remove own vote" on date_votes for delete using (auth.uid() = profile_id);
