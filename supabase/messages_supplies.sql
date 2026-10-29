-- ===== Step 37: Messages from a parent, and "I bought it" for supplies =====
-- The dashboard sends a short message ("Be great today, son!") or tells a kid
-- their supply item was bought. Both go into each kid's parent inbox, and the
-- kid's phone shows them the next time it opens. Safe to run more than once.

create or replace function parent_send(p_token uuid, p_nicknames text[], p_kind text, p_text text,
                                       p_from text default 'Dad', p_days int default 1) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_text text; v_from text; v_kid record; v_inbox jsonb; v_sent int := 0; v_max int;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  if p_kind not in ('note', 'bought') then
    return jsonb_build_object('ok', false, 'error', 'Unknown kind of message');
  end if;
  v_max := case when p_kind = 'note' then 140 else 40 end;
  v_text := left(btrim(regexp_replace(regexp_replace(coalesce(p_text, ''), '[[:cntrl:]<>]', ' ', 'g'), '\s+', ' ', 'g')), v_max);
  v_from := left(btrim(regexp_replace(coalesce(p_from, ''), '[[:cntrl:]<>]', ' ', 'g')), 20);
  if v_text = '' then
    return jsonb_build_object('ok', false, 'error', 'Type a message');
  end if;
  if v_from = '' then v_from := 'Dad'; end if;

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
      'type', p_kind, 'text', v_text, 'from', v_from,
      'days', greatest(1, least(coalesce(p_days, 1), 7)), 'id', gen_random_uuid(), 'at', now()));
    update kid_data set data = data || jsonb_build_object('kiddyKatParentInbox', v_inbox::text), updated_at = now()
    where kid_id = v_kid.id;
    v_sent := v_sent + 1;
  end loop;

  if v_sent = 0 then
    return jsonb_build_object('ok', false, 'error', 'No kids found');
  end if;
  return jsonb_build_object('ok', true, 'sent', v_sent);
end $$;

revoke execute on function parent_send(uuid, text[], text, text, text, int) from public;
grant execute on function parent_send(uuid, text[], text, text, text, int) to anon;

notify pgrst, 'reload schema';
