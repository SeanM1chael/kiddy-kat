-- Kiddy Kat League (private, between families) and the Sibling Challenge.
-- Safe to run more than once.
-- Each kid's phone works out its own weekly points from what the app records
-- (finished checklists, right practice answers, challenge wins, approved catch-up)
-- and saves them as "_league" with its progress. These functions read them.

create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,         -- like LG-7QM4XZ, shared parent to parent
  name text not null,
  created_at timestamptz default now()
);
alter table leagues enable row level security;

alter table families add column if not exists league_id uuid references leagues(id) on delete set null;
alter table families add column if not exists league_on boolean not null default true;
alter table star_gifts add column if not exists from_kid uuid references kids(id) on delete set null;

-- This week's points saved by a kid's phone (0 if it's from an older week)
create or replace function kid_week_points(p_data jsonb) returns int
language plpgsql stable as $$
declare l jsonb;
begin
  begin
    l := (p_data->>'_league')::jsonb;
  exception when others then
    return 0;
  end;
  if l is null or l->>'week' <> to_char(week_start() at time zone 'America/Los_Angeles', 'YYYY-MM-DD') then
    return 0;
  end if;
  return least(greatest(coalesce((l->>'points')::int, 0), 0), 500);
end $$;

-- Who is asking: a parent or a kid wristband (fans can't see the league)
create or replace function league_session(p_token uuid) returns sessions
language sql security definer set search_path = public as $$
  select * from sessions where token = p_token and expires_at > now();
$$;

-- Parent: start a league (your family joins it)
create or replace function create_league(p_token uuid, p_name text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s sessions; v_code text; v_id uuid;
  letters text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  s := league_session(p_token);
  if s.token is null or s.kid_id is not null then return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up'); end if;
  if length(trim(coalesce(p_name, ''))) = 0 then return jsonb_build_object('ok', false, 'error', 'Give the league a name'); end if;
  loop
    v_code := 'LG-';
    for i in 1..6 loop
      v_code := v_code || substr(letters, 1 + get_byte(gen_random_bytes(1), 0) % length(letters), 1);
    end loop;
    exit when not exists (select 1 from leagues where code = v_code);
  end loop;
  insert into leagues (code, name) values (v_code, left(trim(p_name), 40)) returning id into v_id;
  update families set league_id = v_id, league_on = true where id = s.family_id;
  return jsonb_build_object('ok', true, 'code', v_code);
end $$;

-- Parent: join another family's league with its code
create or replace function join_league(p_token uuid, p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_id uuid;
begin
  s := league_session(p_token);
  if s.token is null or s.kid_id is not null then return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up'); end if;
  select id into v_id from leagues where code = upper(trim(p_code));
  if v_id is null then return jsonb_build_object('ok', false, 'error', 'League code not found'); end if;
  update families set league_id = v_id, league_on = true where id = s.family_id;
  return jsonb_build_object('ok', true);
end $$;

-- Parent: leave the league, or turn it off/on for your kids
create or replace function leave_league(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  s := league_session(p_token);
  if s.token is null or s.kid_id is not null then return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up'); end if;
  update families set league_id = null where id = s.family_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function set_league_on(p_token uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  s := league_session(p_token);
  if s.token is null or s.kid_id is not null then return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up'); end if;
  update families set league_on = coalesce(p_on, true) where id = s.family_id;
  return jsonb_build_object('ok', true);
end $$;

-- Standings for this week. Only the top 3 in each animal group show points.
-- Everyone else is listed by name with a goal badge, never with a rank.
create or replace function league_standings(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; f families; lg leagues; v_groups jsonb; v_cup jsonb; v_me int;
begin
  s := league_session(p_token);
  if s.token is null then return jsonb_build_object('ok', false, 'error', 'Please log in again'); end if;
  select * into f from families where id = s.family_id;
  if f.league_id is null then return jsonb_build_object('ok', true, 'in_league', false, 'league_on', f.league_on); end if;
  if not f.league_on and s.kid_id is not null then return jsonb_build_object('ok', true, 'in_league', false, 'league_on', false); end if;
  select * into lg from leagues where id = f.league_id;

  with pts as (
    select k.id, k.nickname, k.animal, fam.name as family, fam.id as family_id, kid_week_points(d.data) as points
    from kids k join families fam on fam.id = k.family_id join kid_data d on d.kid_id = k.id
    where fam.league_id = lg.id and fam.league_on
  ), ranked as (
    select *, rank() over (partition by animal order by points desc) as place from pts
  )
  select coalesce(jsonb_object_agg(animal, grp), '{}'::jsonb) into v_groups from (
    select animal, jsonb_build_object(
      'top', coalesce((select jsonb_agg(jsonb_build_object('nickname', r.nickname, 'family', r.family, 'points', r.points, 'place', r.place)
                                        order by r.place, r.nickname)
                       from ranked r where r.animal = a.animal and r.place <= 3 and r.points > 0), '[]'::jsonb),
      'others', coalesce((select jsonb_agg(jsonb_build_object('nickname', r.nickname, 'family', r.family, 'goal', r.points >= 60)
                                           order by r.nickname)
                          from ranked r where r.animal = a.animal and (r.place > 3 or r.points = 0)), '[]'::jsonb)
    ) as grp
    from (select distinct animal from ranked) a
  ) g;

  -- Family Cup: average points per kid, top 3 families only
  select coalesce(jsonb_agg(jsonb_build_object('family', family, 'average', average) order by average desc), '[]'::jsonb)
  into v_cup from (
    select fam.name as family, round(avg(kid_week_points(d.data)))::int as average
    from families fam join kids k on k.family_id = fam.id join kid_data d on d.kid_id = k.id
    where fam.league_id = lg.id and fam.league_on
    group by fam.id, fam.name
    order by 2 desc
    limit 3
  ) c;

  if s.kid_id is not null then
    select kid_week_points(data) into v_me from kid_data where kid_id = s.kid_id;
  end if;

  return jsonb_build_object('ok', true, 'in_league', true, 'league_on', f.league_on, 'name', lg.name,
    'code', case when s.kid_id is null then lg.code end,       -- only grown-ups see the code
    'goal', 60, 'groups', v_groups, 'cup', v_cup, 'me', v_me);
end $$;

-- Sibling Challenge: this family's team total vs. the team goal (40 points per kid)
create or replace function family_team(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_kids jsonb; v_total int; v_count int;
begin
  s := league_session(p_token);
  if s.token is null then return jsonb_build_object('ok', false, 'error', 'Please log in again'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('nickname', k.nickname, 'animal', k.animal, 'points', kid_week_points(d.data),
                                               'me', k.id = s.kid_id) order by k.created_at), '[]'::jsonb),
         coalesce(sum(kid_week_points(d.data)), 0), count(*)
  into v_kids, v_total, v_count
  from kids k join kid_data d on d.kid_id = k.id where k.family_id = s.family_id;
  return jsonb_build_object('ok', true, 'kids', v_kids, 'total', v_total, 'goal', 40 * greatest(v_count, 1),
    'week', to_char(week_start() at time zone 'America/Los_Angeles', 'YYYY-MM-DD'));
end $$;

-- Kindness star: once a day, a kid can send a sibling 1 star with a thank-you
create or replace function kid_give_kindness(p_token uuid, p_to text, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_from text; v_to uuid;
begin
  s := league_session(p_token);
  if s.token is null or s.kid_id is null then return jsonb_build_object('ok', false, 'error', 'Please log in again'); end if;
  select nickname into v_from from kids where id = s.kid_id;
  select id into v_to from kids where family_id = s.family_id and lower(nickname) = lower(trim(p_to)) and id <> s.kid_id;
  if v_to is null then return jsonb_build_object('ok', false, 'error', 'Pick a brother or sister'); end if;
  perform pg_advisory_xact_lock(hashtext(s.kid_id::text));
  if exists (select 1 from star_gifts where from_kid = s.kid_id
             and created_at >= date_trunc('day', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles') then
    return jsonb_build_object('ok', false, 'error', 'You already sent a kindness star today. Try again tomorrow!');
  end if;
  insert into star_gifts (family_id, kid_id, from_kid, from_name, stars, note)
  values (s.family_id, v_to, s.kid_id, v_from || ' (kindness)', 1, nullif(left(trim(coalesce(p_note, '')), 80), ''));
  perform add_to_inbox(v_to, jsonb_build_object('type', 'stars', 'stars', 1, 'from', v_from,
                                                'note', nullif(left(trim(coalesce(p_note, '')), 80), ''), 'kindness', true));
  return jsonb_build_object('ok', true);
end $$;

-- Who can call what
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function parent_login(text, text), list_kids(text), add_kid(uuid, text, text, text),
                          kid_login(text, text, text), load_my_data(uuid),
                          save_my_data(uuid, jsonb, timestamptz), family_overview(uuid),
                          ai_start(uuid), ai_log(uuid, text, int),
                          parent_send_to_kid(uuid, text, text, text), parent_decide(uuid, text, jsonb),
                          parent_gift_stars(uuid, text, int, text, text),
                          add_fan(uuid, text, text, int), list_fans(uuid), remove_fan(uuid, text),
                          fan_login(text, text, text), fan_status(uuid), fan_gift_stars(uuid, text, int, text),
                          create_league(uuid, text), join_league(uuid, text), leave_league(uuid),
                          set_league_on(uuid, boolean), league_standings(uuid), family_team(uuid),
                          kid_give_kindness(uuid, text, text)
  to anon;

notify pgrst, 'reload schema';
