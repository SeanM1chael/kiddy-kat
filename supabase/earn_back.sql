-- =====================================================================
-- Step 41: 🎯 Earn-back goals
-- A grown-up sets a goal for a kid on the dashboard, like
-- "Roblox for 1 hour: earn 50 ⭐". It goes into the kid's parent inbox.
-- Every star the kid earns from then on counts. When they reach it,
-- the dashboard shows it under 🔔 Waiting for you to say yes.
-- Safe to run more than once.
-- =====================================================================
create or replace function parent_earnback(p_token uuid, p_nickname text, p_goal text, p_stars int,
                                           p_from text default 'Dad', p_cancel boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_kid uuid; v_inbox jsonb; v_goal text; v_from text;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  select id into v_kid from kids where family_id = s.family_id and lower(nickname) = lower(btrim(p_nickname));
  if v_kid is null then
    return jsonb_build_object('ok', false, 'error', 'Kid not found');
  end if;
  v_goal := left(btrim(regexp_replace(regexp_replace(coalesce(p_goal, ''), '[[:cntrl:]<>]', ' ', 'g'), '\s+', ' ', 'g')), 60);
  v_from := left(btrim(regexp_replace(coalesce(p_from, ''), '[[:cntrl:]<>]', ' ', 'g')), 20);
  if v_from = '' then v_from := 'Dad'; end if;
  if not coalesce(p_cancel, false) then
    if v_goal = '' then return jsonb_build_object('ok', false, 'error', 'Type what they can earn back'); end if;
    if p_stars is null or p_stars < 5 or p_stars > 500 then
      return jsonb_build_object('ok', false, 'error', 'Pick between 5 and 500 stars');
    end if;
  end if;
  select coalesce((data->>'kiddyKatParentInbox')::jsonb, '[]'::jsonb) into v_inbox
  from kid_data where kid_id = v_kid for update;
  v_inbox := v_inbox || jsonb_build_array(jsonb_build_object(
    'type', 'earnback', 'goal', v_goal, 'stars', coalesce(p_stars, 0), 'from', v_from,
    'cancel', coalesce(p_cancel, false), 'id', gen_random_uuid(), 'at', now()));
  update kid_data set data = data || jsonb_build_object('kiddyKatParentInbox', v_inbox::text), updated_at = now()
  where kid_id = v_kid;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function parent_earnback(uuid, text, text, int, text, boolean) from public;
grant execute on function parent_earnback(uuid, text, text, int, text, boolean) to anon;

notify pgrst, 'reload schema';
