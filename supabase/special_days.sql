-- ===== Step 35: Special days from the dashboard =====
-- A grown-up adds (or removes) a one-time special day, like "Halloween dress-up day",
-- for some or all kids at once. It goes into each kid's parent inbox, and the kid's
-- phone adds it to their Special days list the next time it opens.
-- Safe to run more than once.

create or replace function parent_add_event(p_token uuid, p_nicknames text[], p_date date, p_tip text,
                                            p_remove boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_tip text; v_kid record; v_inbox jsonb; v_sent int := 0;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  v_tip := left(btrim(regexp_replace(regexp_replace(coalesce(p_tip, ''), '[[:cntrl:]<>]', ' ', 'g'), '\s+', ' ', 'g')), 120);
  if v_tip = '' then
    return jsonb_build_object('ok', false, 'error', 'Type what the day is');
  end if;
  if p_date is null or p_date < current_date - 1 or p_date > current_date + 366 then
    return jsonb_build_object('ok', false, 'error', 'Pick a date in the next year');
  end if;

  for v_kid in
    select k.id from kids k
    where k.family_id = s.family_id
      and (p_nicknames is null or cardinality(p_nicknames) = 0
           or lower(k.nickname) = any (select lower(btrim(n)) from unnest(p_nicknames) n))
  loop
    select coalesce((data->>'kiddyKatParentInbox')::jsonb, '[]'::jsonb) into v_inbox
    from kid_data where kid_id = v_kid.id for update;
    if v_inbox is null then continue; end if;
    v_inbox := v_inbox || jsonb_build_array(jsonb_build_object(
      'type', 'event', 'date', to_char(p_date, 'YYYY-MM-DD'), 'tip', v_tip,
      'remove', coalesce(p_remove, false), 'id', gen_random_uuid(), 'at', now()));
    update kid_data set data = data || jsonb_build_object('kiddyKatParentInbox', v_inbox::text), updated_at = now()
    where kid_id = v_kid.id;
    v_sent := v_sent + 1;
  end loop;

  if v_sent = 0 then
    return jsonb_build_object('ok', false, 'error', 'No kids found');
  end if;
  return jsonb_build_object('ok', true, 'sent', v_sent);
end $$;

revoke execute on function parent_add_event(uuid, text[], date, text, boolean) from public;
grant execute on function parent_add_event(uuid, text[], date, text, boolean) to anon;

notify pgrst, 'reload schema';
