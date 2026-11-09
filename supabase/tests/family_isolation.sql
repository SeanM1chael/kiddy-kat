-- =====================================================================
-- 🔒 Family isolation test (run on a TEST copy of the database, never production)
-- Family B (which also has a kid named "Juju") tries every way to reach
-- Family A's data. Passes only if nothing of Family A changes or leaks.
-- Needs Family A from the setup tests: "Test Family", parent PIN 4821,
-- kids "PJ Flash" (PIN 7391) and "Juju" (PIN 5823).
-- =====================================================================
create or replace function pg_temp.a_snapshot(p_family uuid) returns text language sql as $$
  select md5(concat_ws('|',
    (select string_agg(k.nickname || ':' || md5(coalesce(d.data::text, '')), ',' order by k.nickname) from kids k left join kid_data d on d.kid_id = k.id where k.family_id = p_family),
    (select string_agg(name, ',' order by name) from fans where family_id = p_family),
    (select count(*)::text from kid_uploads where family_id = p_family),
    (select count(*)::text from family_games where family_id = p_family),
    -- the family row, minus the wrong-PIN counter (step 1 tries wrong PINs on purpose; that's checked separately)
    (select (to_jsonb(f) - 'failed_tries' - 'locked_until')::text from families f where f.id = p_family)));
$$;

do $$
declare
  a_code text; a_fam uuid; a_pj uuid; a_parent uuid; a_kid uuid; a_upload bigint; before text; after text;
  b jsonb; b_code text; b_parent uuid; b_kid uuid; b_fan uuid; r jsonb; fails int := 0;
begin
  select id, code into a_fam, a_code from families where name = 'Test Family';
  a_parent := (parent_login(a_code, '4821')->>'token')::uuid;
  a_pj := (kid_login(a_code, 'PJ Flash', '7391')->>'token')::uuid;
  -- Family A has a secret in its data, an upload, and a game in progress
  update kid_data set data = data || '{"kiddyKatSecret":"A-family-secret"}'::jsonb where kid_id = (select id from kids where family_id = a_fam and nickname = 'Juju');
  a_upload := (kid_upload(a_pj, 'data:image/png;base64,iVBORw0KGgo=', 'A homework')->>'id')::bigint;
  perform game_new(a_pj, 'ttt', 'Juju');

  -- Family B: same kid nickname "Juju", plus a Fan
  b := sign_up_family('Other Family', '1357', true);
  b_code := b->>'code';
  b_parent := (parent_login(b_code, '1357')->>'token')::uuid;
  perform add_kid(b_parent, 'Juju', 'kitten', '2468');
  perform add_kid(b_parent, 'Max', 'tiger', '1122');
  b_kid := (kid_login(b_code, 'Juju', '2468')->>'token')::uuid;
  perform add_fan(b_parent, 'Grandpa B', '9753', 20);
  b_fan := (fan_login(b_code, 'Grandpa B', '9753')->>'token')::uuid;
  perform parent_set_town_visits(b_parent, true);

  before := pg_temp.a_snapshot(a_fam);

  -- 1. Logins never cross families
  if kid_login(b_code, 'PJ Flash', '7391')->>'token' is not null then fails := fails + 1; raise notice 'FAIL: A kid logged in with B code'; end if;
  if kid_login(a_code, 'Juju', '2468')->>'token' is not null then fails := fails + 1; raise notice 'FAIL: B PIN opened A Juju'; end if;
  if parent_login(a_code, '1357')->>'token' is not null then fails := fails + 1; raise notice 'FAIL: B parent PIN opened A'; end if;
  if (select failed_tries from families where id = a_fam) < 1 then fails := fails + 1; raise notice 'FAIL: wrong PIN was not counted toward lockout'; end if;
  update families set failed_tries = 0, locked_until = null where id = a_fam;

  -- 2. Family B's parent aims every parent tool at Family A's kids
  perform parent_send(b_parent, array['PJ Flash'], 'note', 'hi from B', 'B', 1);
  perform parent_send_to_kid(b_parent, 'PJ Flash', 'kiddyKatSecret', 'overwritten');
  perform parent_gift_stars(b_parent, 'PJ Flash', 5, 'from B', 'B');
  perform parent_decide(b_parent, 'PJ Flash', '{"id":"x","ok":true}'::jsonb);
  perform parent_earnback(b_parent, 'PJ Flash', 'goal', 10, 'B', false);
  perform parent_set_tasks(b_parent, array['PJ Flash'], 'morning', array['B task'], true, 'B');
  perform parent_add_event(b_parent, array['PJ Flash'], current_date, 'B event', false);
  perform parent_town_limit(b_parent, 'PJ Flash', 0, 'B');
  perform parent_town_time(b_parent, 'PJ Flash', 1, 'B');
  perform remove_fan(b_parent, 'Grandpa');
  perform delete_upload(b_parent, a_upload);
  perform delete_family(b_parent, '1357', a_code);

  -- 3. Family B's kid and Fan aim kid tools at Family A
  perform town_react(b_kid, 'PJ Flash', 'wow');
  perform kid_give_kindness(b_kid, 'PJ Flash', 'from B');
  perform game_new(b_kid, 'ttt', 'PJ Flash');
  perform fan_gift_stars(b_fan, 'PJ Flash', 1, 'from B fan');
  perform parent_town_limit(b_parent, 'Juju', 30, 'B');            -- B's own Juju: must not touch A's Juju

  after := pg_temp.a_snapshot(a_fam);
  if before is distinct from after then fails := fails + 1; raise notice 'FAIL: Family A data changed'; else raise notice 'PASS: Family A unchanged after 17 attempts from Family B'; end if;

  -- 4. Nothing Family B reads contains Family A
  r := jsonb_build_object('load', load_my_data(b_kid), 'overview', family_overview(b_parent), 'towns', family_towns(b_kid),
    'ballot', town_ballot(b_kid), 'games', game_list(b_kid), 'uploads', list_uploads(b_parent), 'upload', get_upload(b_parent, a_upload),
    'fans', list_fans(b_parent), 'league', league_standings(b_parent), 'team', family_team(b_kid), 'fanstatus', fan_status(b_fan));
  if r::text like '%A-family-secret%' or r::text like '%PJ Flash%' or r::text like '%A homework%' or r::text like '%iVBOR%' then
    fails := fails + 1; raise notice 'FAIL: Family B can read Family A: %', left(r::text, 300);
  else raise notice 'PASS: nothing Family B reads contains Family A'; end if;

  -- 5. B's own Juju got B's message; A's Juju didn't (same nickname, different family)
  if (select data->>'kiddyKatParentInbox' from kid_data d join kids k on k.id = d.kid_id where k.family_id = a_fam and k.nickname = 'Juju') like '%"limit": 30%' then
    fails := fails + 1; raise notice 'FAIL: B message reached A Juju';
  else raise notice 'PASS: same nickname in two families stays separate'; end if;

  -- Clean up Family B and the test data
  delete from families where id = (select id from families where code = b_code);
  delete from kid_uploads where id = a_upload;
  delete from family_games where family_id = a_fam;
  update kid_data set data = data - 'kiddyKatSecret' where kid_id = (select id from kids where family_id = a_fam and nickname = 'Juju');
  if fails > 0 then raise exception '% isolation check(s) failed', fails; end if;
  raise notice 'ALL FAMILY ISOLATION CHECKS PASSED';
end $$;

-- 6. Phones (the "anon" role) can't read any table directly; everything goes through the checked functions
set role anon;
do $$
declare t text; n int; fails int := 0;
begin
  foreach t in array array['families', 'kids', 'kid_data', 'sessions', 'fans', 'fan_sessions', 'kid_uploads', 'family_games', 'push_devices', 'leagues', 'star_gifts', 'town_votes', 'town_reactions'] loop
    begin
      execute format('select count(*) from %I', t) into n;
      if n > 0 then fails := fails + 1; raise notice 'FAIL: anon can read % rows of %', n, t; end if;
    exception when insufficient_privilege then null;
    end;
  end loop;
  if fails > 0 then raise exception '% table(s) readable by phones', fails; end if;
  raise notice 'PASS: phones cannot read any table directly';
end $$;
reset role;
