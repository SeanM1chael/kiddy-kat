-- =====================================================================
-- Step 47: 🏛️ Town Hall family vote
-- Each week the family's Kat Town has 3 projects on the ballot. Every kid
-- (not grown-ups) gets one vote, with a reason picked from a short list.
-- When every kid has voted, the result is final and the winner gets built
-- in every kid's town. If not everyone votes, the week's top choice wins
-- when the week ends (a tie goes to the choice listed first).
-- Safe to run more than once.
-- =====================================================================
create table if not exists town_votes (
  family_id uuid not null references families(id) on delete cascade,
  week date not null,
  kid_id uuid not null references kids(id) on delete cascade,
  choice text not null,
  reason text,
  created_at timestamptz default now(),
  primary key (family_id, week, kid_id));
alter table town_votes enable row level security;

-- Monday of this week (Pacific time)
create or replace function hall_week(p_at timestamptz default now()) returns date
language sql stable as $$
  select (date_trunc('week', p_at at time zone 'America/Los_Angeles'))::date;
$$;

-- The 3 projects on a week's ballot (the same for the whole family, different each week)
create or replace function hall_options(p_week date) returns text[]
language sql immutable as $$
  with all_projects as (
    select array['park', 'library', 'dogpark', 'skatepark', 'garden', 'splashpad', 'zoo', 'stage'] as a),
  n as (select ((p_week - date '2026-01-05') / 7) as w)
  select array[a[1 + ((w * 3) % 8)], a[1 + ((w * 3 + 1) % 8)], a[1 + ((w * 3 + 2) % 8)]]
  from all_projects, n;
$$;

-- The winner of one week, or null if nobody voted
create or replace function hall_winner(p_family uuid, p_week date) returns text
language sql stable as $$
  select o.choice from unnest(hall_options(p_week)) with ordinality as o(choice, pos)
  left join town_votes v on v.family_id = p_family and v.week = p_week and v.choice = o.choice
  group by o.choice, o.pos
  having count(v.kid_id) > 0
  order by count(v.kid_id) desc, o.pos
  limit 1;
$$;

create or replace function town_ballot(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_week date := hall_week(); v_kids int; v_voted int; v_final boolean;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is null then
    return jsonb_build_object('ok', false, 'error', 'Please log in again');
  end if;
  select count(*) into v_kids from kids where family_id = s.family_id and animal <> 'eagle';
  select count(*) into v_voted from town_votes where family_id = s.family_id and week = v_week;
  v_final := v_voted >= v_kids and v_kids > 0;
  return jsonb_build_object('ok', true,
    'week', v_week,
    'options', to_jsonb(hall_options(v_week)),
    'counts', (select coalesce(jsonb_object_agg(choice, n), '{}'::jsonb) from
                (select choice, count(*) as n from town_votes where family_id = s.family_id and week = v_week group by choice) c),
    'mine', (select choice from town_votes where family_id = s.family_id and week = v_week and kid_id = s.kid_id),
    'voted', (select coalesce(jsonb_agg(k.nickname order by v.created_at), '[]'::jsonb) from town_votes v join kids k on k.id = v.kid_id
              where v.family_id = s.family_id and v.week = v_week),
    'kids', v_kids,
    'final', v_final,
    'winner', case when v_final then hall_winner(s.family_id, v_week) end,
    -- every past week's winner (last 12 weeks), plus this week's once it's final
    'winners', (select coalesce(jsonb_agg(jsonb_build_object('week', w, 'choice', hall_winner(s.family_id, w)) order by w), '[]'::jsonb)
                from (select distinct week as w from town_votes where family_id = s.family_id
                      and week >= v_week - 84 and (week < v_week or v_final)) weeks));
end $$;

create or replace function town_vote(p_token uuid, p_choice text, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_week date := hall_week(); v_kids int; v_voted int; v_animal text;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is null then
    return jsonb_build_object('ok', false, 'error', 'Please log in again');
  end if;
  select animal into v_animal from kids where id = s.kid_id;
  if v_animal = 'eagle' then return jsonb_build_object('ok', false, 'error', 'Town Hall votes are for kids'); end if;
  if p_choice is null or not (p_choice = any (hall_options(v_week))) then
    return jsonb_build_object('ok', false, 'error', 'Pick one of this week''s projects');
  end if;
  if p_reason is not null and p_reason not in ('everyone', 'nature', 'healthy', 'fun', 'learn') then
    return jsonb_build_object('ok', false, 'error', 'Pick a reason');
  end if;
  perform pg_advisory_xact_lock(hashtext(s.family_id::text));
  select count(*) into v_kids from kids where family_id = s.family_id and animal <> 'eagle';
  select count(*) into v_voted from town_votes where family_id = s.family_id and week = v_week;
  if v_voted >= v_kids then
    return jsonb_build_object('ok', false, 'error', 'Everyone already voted this week. The results are in!');
  end if;
  insert into town_votes (family_id, week, kid_id, choice, reason) values (s.family_id, v_week, s.kid_id, p_choice, p_reason)
  on conflict (family_id, week, kid_id) do update set choice = excluded.choice, reason = excluded.reason, created_at = now();
  return town_ballot(p_token);
end $$;

revoke execute on function hall_week(timestamptz), hall_options(date), hall_winner(uuid, date),
                           town_ballot(uuid), town_vote(uuid, text, text) from public;
grant execute on function town_ballot(uuid), town_vote(uuid, text, text) to anon;

notify pgrst, 'reload schema';
