-- ===== Step 38: Grown-up career mode (the eagle 🦅) =====
-- Lets a family add a grown-up as an "eagle" (career mode). Safe to run more than once.

create or replace function add_kid(p_token uuid, p_nickname text, p_animal text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s sessions; v_kid uuid;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  if p_animal not in ('kitten', 'tiger', 'lion', 'eagle') then
    return jsonb_build_object('ok', false, 'error', 'Animal must be kitten, tiger, lion or eagle');
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    return jsonb_build_object('ok', false, 'error', 'PIN must be 4 digits');
  end if;
  if length(btrim(coalesce(p_nickname, ''))) = 0 or length(btrim(p_nickname)) > 20 then
    return jsonb_build_object('ok', false, 'error', 'Nickname must be 1 to 20 characters');
  end if;
  if exists (select 1 from kids where family_id = s.family_id and lower(nickname) = lower(trim(p_nickname))) then
    return jsonb_build_object('ok', false, 'error', 'That nickname is already used');
  end if;
  insert into kids (family_id, nickname, animal, pin_hash)
  values (s.family_id, trim(p_nickname), p_animal, crypt(p_pin, gen_salt('bf')))
  returning id into v_kid;
  insert into kid_data (kid_id) values (v_kid);
  return jsonb_build_object('ok', true);
end $$;

notify pgrst, 'reload schema';
