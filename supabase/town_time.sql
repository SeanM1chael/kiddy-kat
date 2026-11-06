-- =====================================================================
-- Step 49: ⏳ Kat Town daily play time
-- A grown-up sets how many minutes a day a kid can spend in Kat Town
-- (0 = no limit) from the dashboard. It goes to the kid's phone through
-- the parent inbox. (Bedtime closing uses the bedtime already set on each
-- phone, so it needs nothing here.) Safe to run more than once.
-- =====================================================================
create or replace function parent_town_time(p_token uuid, p_nickname text, p_minutes int, p_from text default 'Dad') returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_kid uuid; v_from text;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  if p_minutes is null or p_minutes < 0 or p_minutes > 600 then
    return jsonb_build_object('ok', false, 'error', 'Pick between 0 and 600 minutes');
  end if;
  select id into v_kid from kids where family_id = s.family_id and lower(nickname) = lower(btrim(coalesce(p_nickname, '')));
  if v_kid is null then return jsonb_build_object('ok', false, 'error', 'Kid not found'); end if;
  v_from := left(btrim(regexp_replace(coalesce(p_from, ''), '[[:cntrl:]<>]', ' ', 'g')), 20);
  if v_from = '' then v_from := 'Dad'; end if;
  perform add_to_inbox(v_kid, jsonb_build_object('type', 'towntime', 'minutes', p_minutes, 'from', v_from));
  return jsonb_build_object('ok', true, 'minutes', p_minutes);
end $$;

revoke execute on function parent_town_time(uuid, text, int, text) from public;
grant execute on function parent_town_time(uuid, text, int, text) to anon;

notify pgrst, 'reload schema';
