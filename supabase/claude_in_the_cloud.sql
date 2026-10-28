-- Claude in the cloud: keep track of what Claude costs each month,
-- stop at $5, and let a grown-up send things straight to a kid's phone.

create table ai_usage (
  id bigint generated always as identity primary key,
  family_id uuid not null references families(id) on delete cascade,
  kind text not null,                 -- "read photo" or "practice pack"
  cost_micro int not null,            -- millionths of a dollar: 1000000 = $1
  created_at timestamptz default now()
);
alter table ai_usage enable row level security;

-- This month's spending, counted in Pacific time
create or replace function ai_spent_this_month(p_family uuid) returns int
language sql security definer set search_path = public as $$
  select coalesce(sum(cost_micro), 0)::int from ai_usage
  where family_id = p_family
    and created_at >= date_trunc('month', now() at time zone 'America/Los_Angeles') at time zone 'America/Los_Angeles';
$$;

-- Asked before every Claude call: is this a grown-up, and is there money left this month?
create or replace function ai_start(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_spent int; v_cap int := 5000000;      -- $5.00
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  v_spent := ai_spent_this_month(s.family_id);
  if v_spent >= v_cap - 100000 then                           -- keep 10 cents of room
    return jsonb_build_object('ok', false, 'error',
      'This month''s Claude limit ($5) is used up. It starts over on the 1st.');
  end if;
  return jsonb_build_object('ok', true, 'spent_micro', v_spent, 'cap_micro', v_cap);
end $$;

-- Written after every Claude call with what it actually cost
create or replace function ai_log(p_token uuid, p_kind text, p_cost_micro int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  insert into ai_usage (family_id, kind, cost_micro)
  values (s.family_id, left(p_kind, 40), greatest(p_cost_micro, 0));
  return jsonb_build_object('ok', true, 'spent_micro', ai_spent_this_month(s.family_id));
end $$;

-- A grown-up sends something to a kid's phone (practice pack, catch-up list, specials schedule)
create or replace function parent_send_to_kid(p_token uuid, p_nickname text, p_key text, p_value text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_kid uuid;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then
    return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up');
  end if;
  if p_key not in ('kiddyKatPack', 'kiddyKatCatchUp', 'kiddyKatSpecials') then
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

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function parent_login(text, text), list_kids(text), add_kid(uuid, text, text, text),
                          kid_login(text, text, text), load_my_data(uuid),
                          save_my_data(uuid, jsonb, timestamptz), family_overview(uuid),
                          ai_start(uuid), ai_log(uuid, text, int),
                          parent_send_to_kid(uuid, text, text, text)
  to anon;
