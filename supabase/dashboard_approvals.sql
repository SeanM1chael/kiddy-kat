-- Approvals from the dashboard: a grown-up's decision goes into the kid's
-- "inbox". The kid's phone carries it out the next time it syncs.
create or replace function parent_decide(p_token uuid, p_nickname text, p_decision jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_kid uuid; v_inbox jsonb;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  if p_decision->>'type' not in ('reward', 'job', 'payout') then
    return jsonb_build_object('ok', false, 'error', 'Unknown kind of decision');
  end if;
  select id into v_kid from kids where family_id = s.family_id and lower(nickname) = lower(trim(p_nickname));
  if v_kid is null then
    return jsonb_build_object('ok', false, 'error', 'Kid not found');
  end if;
  select coalesce((data->>'kiddyKatParentInbox')::jsonb, '[]'::jsonb) into v_inbox
  from kid_data where kid_id = v_kid for update;
  v_inbox := v_inbox || jsonb_build_array(p_decision || jsonb_build_object('id', gen_random_uuid(), 'at', now()));
  update kid_data set data = data || jsonb_build_object('kiddyKatParentInbox', v_inbox::text), updated_at = now()
  where kid_id = v_kid;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function parent_decide(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function parent_decide(uuid, text, jsonb) to anon;
