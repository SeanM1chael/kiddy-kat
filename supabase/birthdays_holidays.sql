-- =====================================================================
-- Step 50: 🎉 Birthdays and holidays
-- • The dashboard can send the family's holiday choices to each phone.
-- • Brothers and sisters can send a birthday gift (🎂 🎈 🎁 💌) when they
--   visit, but only on that kid's party day. Still once per sibling per day.
-- • family_towns tells siblings when it's someone's party day.
--   (The birthday itself stays on the kid's phone; only "today is my party" is shared.)
-- Safe to run more than once.
-- =====================================================================
create or replace function parent_send_to_kid(p_token uuid, p_nickname text, p_key text, p_value text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_kid uuid;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  if p_key not in ('kiddyKatPack', 'kiddyKatCatchUp', 'kiddyKatSpecials', 'kiddyKatHolidays') then
    return jsonb_build_object('ok', false, 'error', 'That can''t be sent to a phone');
  end if;
  select id into v_kid from kids where family_id = s.family_id and lower(nickname) = lower(trim(p_nickname));
  if v_kid is null then
    return jsonb_build_object('ok', false, 'error', 'Kid not found');
  end if;
  update kid_data set data = data || jsonb_build_object(p_key, p_value), updated_at = now()
  where kid_id = v_kid;
  return jsonb_build_object('ok', true);
end $$;

create or replace function family_towns(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_on boolean;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is null then
    return jsonb_build_object('ok', false, 'error', 'Please log in again');
  end if;
  select town_visits into v_on from families where id = s.family_id;
  if not coalesce(v_on, false) then
    return jsonb_build_object('ok', true, 'on', false, 'towns', '[]'::jsonb);
  end if;
  return jsonb_build_object('ok', true, 'on', true, 'towns', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'nickname', k.nickname,
      'animal', k.animal,
      'avatar', t.town->'avatar',
      'built', coalesce(t.town->'built', '[]'::jsonb),
      'room', coalesce(t.town->'room', '{}'::jsonb),
      'partyDay', t.town->>'partyDay',
      'reacted', exists (select 1 from town_reactions r where r.from_kid = s.kid_id and r.to_kid = k.id
                         and r.day = (now() at time zone 'America/Los_Angeles')::date)
    ) order by k.created_at), '[]'::jsonb)
    from kids k
    join kid_data d on d.kid_id = k.id
    cross join lateral (select safe_jsonb(d.data->>'kiddyKatTown') as town) t
    where k.family_id = s.family_id and k.id <> s.kid_id and k.animal <> 'eagle'
      and t.town is not null and jsonb_typeof(t.town->'avatar') = 'object'));
end $$;

create or replace function town_react(p_token uuid, p_to text, p_reaction text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_from text; v_to uuid; v_on boolean; v_day date;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is null then
    return jsonb_build_object('ok', false, 'error', 'Please log in again');
  end if;
  select town_visits into v_on from families where id = s.family_id;
  if not coalesce(v_on, false) then
    return jsonb_build_object('ok', false, 'error', 'Family visits are off. Ask a grown-up to turn them on.');
  end if;
  if p_reaction not in ('love', 'wow', 'fun', 'best', 'cake', 'balloon', 'present', 'card') then
    return jsonb_build_object('ok', false, 'error', 'Pick a reaction');
  end if;
  select nickname into v_from from kids where id = s.kid_id;
  select id into v_to from kids
  where family_id = s.family_id and lower(nickname) = lower(btrim(coalesce(p_to, ''))) and id <> s.kid_id and animal <> 'eagle';
  if v_to is null then return jsonb_build_object('ok', false, 'error', 'Pick a brother or sister'); end if;
  -- 🎂 Birthday gifts only on that kid's party day (the day their town says it's their birthday)
  if p_reaction in ('cake', 'balloon', 'present', 'card') and coalesce((select safe_jsonb(data->>'kiddyKatTown')->>'partyDay' from kid_data where kid_id = v_to), '')
       <> to_char(now() at time zone 'America/Los_Angeles', 'YYYY-MM-DD') then
    return jsonb_build_object('ok', false, 'error', 'Birthday gifts are only for birthdays!');
  end if;
  v_day := (now() at time zone 'America/Los_Angeles')::date;
  insert into town_reactions (from_kid, to_kid, day, reaction) values (s.kid_id, v_to, v_day, p_reaction)
  on conflict do nothing;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'You already sent a reaction to this town today. Come back tomorrow!');
  end if;
  perform add_to_inbox(v_to, jsonb_build_object('type', 'townvisit', 'from', v_from, 'reaction', p_reaction));
  return jsonb_build_object('ok', true);
end $$;

notify pgrst, 'reload schema';
