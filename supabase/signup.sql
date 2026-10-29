-- ===== Step 36: Sign-up page and "Delete my family" =====
-- New families sign up on signup.html (no SQL Editor). A grown-up can delete
-- the whole family from the dashboard. Safe to run more than once.

-- Record of the parent's consent (who agreed, when, to which version of the privacy policy)
alter table families add column if not exists consent_at timestamptz;
alter table families add column if not exists consent_version text;

-- Easy-to-guess PINs are refused
create or replace function weak_pin(p text) returns boolean
language sql immutable as $$
  select p ~ '^(.)\1+$'                                   -- 0000, 111111
      or position(p in '0123456789012345') > 0            -- 1234, 345678
      or position(p in '9876543210987654') > 0            -- 4321, 987654
      or p in ('1212', '121212', '6969', '1004', '2000', '2580', '0852');
$$;

create or replace function sign_up_family(p_name text, p_parent_pin text, p_consent boolean) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_name text; v_code text; v_family uuid; t uuid;
begin
  if coalesce(p_consent, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'Please confirm you are the parent or guardian and agree to the privacy policy');
  end if;
  v_name := left(btrim(regexp_replace(regexp_replace(coalesce(p_name, ''), '[[:cntrl:]<>]', ' ', 'g'), '\s+', ' ', 'g')), 40);
  if length(v_name) < 2 then
    return jsonb_build_object('ok', false, 'error', 'Type a family name, like "The Smith Family"');
  end if;
  if coalesce(p_parent_pin, '') !~ '^[0-9]{4,8}$' then
    return jsonb_build_object('ok', false, 'error', 'The parent PIN must be 4 to 8 digits');
  end if;
  if weak_pin(p_parent_pin) then
    return jsonb_build_object('ok', false, 'error', 'That PIN is too easy to guess. Try a different one.');
  end if;
  -- Guard against bots: a limit on new families for the whole app
  if (select count(*) from families where created_at > now() - interval '1 hour') >= 20
     or (select count(*) from families where created_at > now() - interval '1 day') >= 100 then
    return jsonb_build_object('ok', false, 'error', 'Lots of families are signing up right now. Please try again in an hour.');
  end if;
  loop
    v_code := new_family_code();
    exit when not exists (select 1 from families where code = v_code);
  end loop;
  insert into families (code, name, parent_pin_hash, consent_at, consent_version)
  values (v_code, v_name, crypt(p_parent_pin, gen_salt('bf')), now(), '2026-10-29')
  returning id into v_family;
  insert into sessions (family_id) values (v_family) returning token into t;
  return jsonb_build_object('ok', true, 'code', v_code, 'token', t, 'family', v_name);
end $$;

-- Deletes the family and everything in it: kids, their saved data, fans, gifts,
-- schoolwork photos, alert devices and logins. Needs the parent PIN and the family code typed.
create or replace function delete_family(p_token uuid, p_pin text, p_code text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s sessions; f families;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  select * into f from families where id = s.family_id;
  if f.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'Too many wrong tries. Wait 15 minutes.');
  end if;
  if upper(btrim(coalesce(p_code, ''))) <> f.code then
    return jsonb_build_object('ok', false, 'error', 'Type your family code exactly to confirm');
  end if;
  if f.parent_pin_hash <> crypt(coalesce(p_pin, ''), f.parent_pin_hash) then
    update families set
      locked_until = case when failed_tries + 1 >= 5 then now() + interval '15 minutes' end,
      failed_tries = case when failed_tries + 1 >= 5 then 0 else failed_tries + 1 end
    where id = f.id;
    return jsonb_build_object('ok', false, 'error', 'Wrong parent PIN');
  end if;
  delete from families where id = f.id;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function sign_up_family(text, text, boolean), delete_family(uuid, text, text), weak_pin(text) from public;
grant execute on function sign_up_family(text, text, boolean), delete_family(uuid, text, text) to anon;

notify pgrst, 'reload schema';
