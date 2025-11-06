create extension if not exists pgcrypto;
-- TEAMS
do $$ begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='teams') then
    create table public.teams (id uuid primary key default gen_random_uuid(), name text not null, abbrev text, external_team_id uuid);
  end if;
  if not exists (select 1 from information_schema.columns where table_name='teams' and column_name='abbrev') then alter table teams add column abbrev text; end if;
  if not exists (select 1 from information_schema.columns where table_name='teams' and column_name='external_team_id') then alter table teams add column external_team_id uuid; end if;
  update teams set abbrev=coalesce(abbrev,upper(substr(name,1,3)));
  update teams set external_team_id=coalesce(external_team_id,gen_random_uuid());
  alter table teams alter column abbrev set not null;
  alter table teams alter column external_team_id set not null;
  alter table teams alter column external_team_id set default gen_random_uuid();
  create unique index if not exists ux_teams_external on teams(external_team_id);
end $$;

-- FANTASY TABLES
create table if not exists team_week_stats (id uuid primary key default gen_random_uuid(), team_id uuid references teams(id) on delete cascade, week int not null, goals int not null default 0, assists int not null default 0, correct_picks int not null default 0, points int not null default 0, unique(team_id, week));
create table if not exists weekly_matchups (id uuid primary key default gen_random_uuid(), week int not null, team_a uuid not null references teams(id) on delete cascade, team_b uuid not null references teams(id) on delete cascade, created_at timestamptz not null default now(), unique(week,team_a,team_b), check(team_a<>team_b));

-- VIEWS (4/2/1)
create or replace view v_overall_totals as
select t.id as team_id,t.name as team_name,coalesce(sum(s.goals),0)::int goals,coalesce(sum(s.assists),0)::int assists,coalesce(sum(s.correct_picks),0)::int correct_picks,(coalesce(sum(s.goals),0)*4+coalesce(sum(s.assists),0)*2+coalesce(sum(s.correct_picks),0))::int total from teams t left join team_week_stats s on s.team_id=t.id group by t.id,t.name order by total desc,goals desc,assists desc;
create or replace view v_weekly_match_results as
with a as (select m.week,m.team_a,m.team_b,coalesce(ta.goals*4+ta.assists*2+ta.correct_picks,0) pts_a,coalesce(tb.goals*4+tb.assists*2+tb.correct_picks,0) pts_b from weekly_matchups m left join team_week_stats ta on ta.team_id=m.team_a and ta.week=m.week left join team_week_stats tb on tb.team_id=m.team_b and tb.week=m.week)
select week,team_a,team_b,pts_a,pts_b,case when pts_a>pts_b then team_a when pts_b>pts_a then team_b else null end as winner_team_id from a;
create or replace view v_season_record as
with wins as (select winner_team_id team_id,count(*)::int wins from v_weekly_match_results where winner_team_id is not null group by winner_team_id),
losses as (select t team_id,count(*)::int losses from (select week,team_a t,case when winner_team_id is not null and winner_team_id<>team_a then 1 else 0 end is_loss from v_weekly_match_results union all select week,team_b t,case when winner_team_id is not null and winner_team_id<>team_b then 1 else 0 end is_loss from v_weekly_match_results)x where is_loss=1 group by t)
select t.id team_id,t.name team_name,coalesce(w.wins,0) wins,coalesce(l.losses,0) losses from teams t left join wins w on w.team_id=t.id left join losses l on l.team_id=t.id;
create or replace view v_standings as
select r.team_id,r.team_name,r.wins,r.losses,coalesce(o.goals,0)::int goals,coalesce(o.assists,0)::int assists,coalesce(o.correct_picks,0)::int correct_picks,o.total::int points_total from v_season_record r left join v_overall_totals o on o.team_id=r.team_id order by r.wins desc,r.losses asc,points_total desc;

-- GENERATOR
create or replace function generate_random_matchups(p_week int) returns void language plpgsql as $$
declare team_ids uuid[]; n int; i int; j int; tmp uuid;
begin select array_agg(id) into team_ids from teams; n:=coalesce(array_length(team_ids,1),0); if n<2 then return; end if;
i:=n; while i>1 loop j:=1+floor(random()*i)::int; tmp:=team_ids[i]; team_ids[i]:=team_ids[j]; team_ids[j]:=tmp; i:=i-1; end loop;
i:=1; while i<=n-1 loop insert into weekly_matchups(week,team_a,team_b) values(p_week,team_ids[i],team_ids[i+1]) on conflict do nothing; i:=i+2; end loop; end; $$;

-- TEAMS SEED (idempotent)
insert into teams(name,abbrev) values ('ANDY','AND'),('RICO','RIC'),('BRANDON','BRA'),('DAVE','DAV'),('SOPHIA','SOP'),('MIKE','MIK') on conflict (abbrev) do nothing;

-- WEEK 1 DEMO + MATCHUPS
insert into team_week_stats(team_id,week,goals,assists,correct_picks,points) select id,1,(random()*6)::int,(random()*6)::int,(8+(random()*8)::int),0 from teams on conflict (team_id,week) do nothing;
select generate_random_matchups(1);

-- USER → TEAM MAP
create table if not exists user_teams (id uuid primary key default gen_random_uuid(), email text not null unique, team_id uuid not null references teams(id) on delete cascade);
insert into user_teams(email,team_id) select 'asnazyk@fallsviewgroup.com',id from teams where name='ANDY' on conflict (email) do nothing;
insert into user_teams(email,team_id) select 'rico@fallsviewgroup.com',id from teams where name='RICO' on conflict (email) do nothing;
insert into user_teams(email,team_id) select 'bpizzi@fallsviewgroup.com',id from teams where name='BRANDON' on conflict (email) do nothing;
insert into user_teams(email,team_id) select 'dpietrangelo@fallsviewgroup.com',id from teams where name='DAVE' on conflict (email) do nothing;
insert into user_teams(email,team_id) select 'sbuzzell@fallsviewgroup.com',id from teams where name='SOPHIA' on conflict (email) do nothing;
insert into user_teams(email,team_id) select 'mwatson@fallsviewgroup.com',id from teams where name='MIKE' on conflict (email) do nothing;
