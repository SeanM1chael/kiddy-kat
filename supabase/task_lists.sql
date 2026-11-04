-- =====================================================================
-- Step 44: 📋 Send a task list from the dashboard
-- A grown-up pastes a list (one task per line), picks the kids and which
-- list it replaces (Morning, After School, Bedtime, or a weekend list).
-- It goes into each kid's parent inbox; their phone swaps the list in.
-- "Locked" lists can't be changed on the kid's phone without the parent PIN.
-- Safe to run more than once.
-- =====================================================================
create or replace function parent_set_tasks(p_token uuid, p_nicknames text[], p_list text, p_items text[],
                                            p_lock boolean default true, p_from text default 'Dad') returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_items jsonb; v_kid record; v_inbox jsonb; v_sent int := 0; v_from text;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  if p_list not in ('morning', 'afternoon', 'bedtime', 'wkMorning', 'wkAfternoon', 'wkBedtime') then
    return jsonb_build_object('ok', false, 'error', 'Pick which list to replace');
  end if;
  -- Clean each line: no odd characters, 80 letters at most, no blank lines, 20 tasks at most
  select coalesce(jsonb_agg(t), '[]'::jsonb) into v_items from (
    select left(btrim(regexp_replace(regexp_replace(x, '[[:cntrl:]<>]', ' ', 'g'), '\s+', ' ', 'g')), 80) as t
    from unnest(coalesce(p_items, '{}')) x
    where btrim(coalesce(x, '')) <> ''
    limit 20) q;
  if jsonb_array_length(v_items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'Type at least one task');
  end if;
  v_from := left(btrim(regexp_replace(coalesce(p_from, ''), '[[:cntrl:]<>]', ' ', 'g')), 20);
  if v_from = '' then v_from := 'Dad'; end if;

  for v_kid in
    select k.id from kids k
    where k.family_id = s.family_id
      and lower(k.nickname) = any (select lower(btrim(n)) from unnest(coalesce(p_nicknames, '{}')) n)
  loop
    select coalesce((data->>'kiddyKatParentInbox')::jsonb, '[]'::jsonb) into v_inbox
    from kid_data where kid_id = v_kid.id for update;
    if v_inbox is null then continue; end if;
    -- A newer list for the same slot replaces an older one still waiting in the inbox
    select coalesce(jsonb_agg(d), '[]'::jsonb) into v_inbox from jsonb_array_elements(v_inbox) d
    where not (d->>'type' = 'tasks' and d->>'list' = p_list);
    v_inbox := v_inbox || jsonb_build_array(jsonb_build_object(
      'type', 'tasks', 'list', p_list, 'items', v_items, 'lock', coalesce(p_lock, true), 'from', v_from,
      'id', gen_random_uuid(), 'at', now()));
    update kid_data set data = data || jsonb_build_object('kiddyKatParentInbox', v_inbox::text), updated_at = now()
    where kid_id = v_kid.id;
    v_sent := v_sent + 1;
  end loop;

  if v_sent = 0 then return jsonb_build_object('ok', false, 'error', 'Pick at least one kid'); end if;
  return jsonb_build_object('ok', true, 'sent', v_sent, 'tasks', jsonb_array_length(v_items));
end $$;

revoke execute on function parent_set_tasks(uuid, text[], text, text[], boolean, text) from public;
grant execute on function parent_set_tasks(uuid, text[], text, text[], boolean, text) to anon;

notify pgrst, 'reload schema';
