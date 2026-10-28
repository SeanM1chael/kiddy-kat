-- Kid uploads: tigers and lions send photos of their schoolwork.
-- A grown-up looks at each one on the grades page and has Claude read it, or deletes it.
-- Photos are deleted once checked, or after 14 days. Safe to run more than once.

create table if not exists kid_uploads (
  id bigint generated always as identity primary key,
  family_id uuid not null references families(id) on delete cascade,
  kid_id uuid not null references kids(id) on delete cascade,
  image text not null,                -- a small JPG, shrunk on the phone
  note text,                          -- like "Math quiz"
  created_at timestamptz default now()
);
alter table kid_uploads enable row level security;

-- Kid sends a photo (kittens can't: their grown-up does it for them)
create or replace function kid_upload(p_token uuid, p_image text, p_note text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; k kids;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is null then return jsonb_build_object('ok', false, 'error', 'Please log in again'); end if;
  select * into k from kids where id = s.kid_id;
  if k.animal = 'kitten' then return jsonb_build_object('ok', false, 'error', 'Ask a grown-up to send it for you'); end if;
  if p_image is null or length(p_image) < 1000 then return jsonb_build_object('ok', false, 'error', 'That photo didn''t come through. Try again.'); end if;
  if length(p_image) > 1200000 then return jsonb_build_object('ok', false, 'error', 'That photo is too big'); end if;
  delete from kid_uploads where created_at < now() - interval '14 days';
  if (select count(*) from kid_uploads where kid_id = k.id) >= 10 then
    return jsonb_build_object('ok', false, 'error', '10 photos are already waiting. Ask your grown-up to check them first.');
  end if;
  insert into kid_uploads (family_id, kid_id, image, note) values (k.family_id, k.id, p_image, nullif(left(trim(coalesce(p_note, '')), 60), ''));
  return jsonb_build_object('ok', true, 'waiting', (select count(*) from kid_uploads where kid_id = k.id));
end $$;

-- Grown-up: the list of waiting photos (no pictures, just who, what and when)
create or replace function list_uploads(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; r jsonb;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up'); end if;
  delete from kid_uploads where created_at < now() - interval '14 days';
  select coalesce(jsonb_agg(jsonb_build_object('id', u.id, 'nickname', k.nickname, 'note', u.note, 'at', u.created_at)
                            order by u.created_at), '[]'::jsonb)
  into r from kid_uploads u join kids k on k.id = u.kid_id where u.family_id = s.family_id;
  return jsonb_build_object('ok', true, 'uploads', r);
end $$;

-- Grown-up: one photo
create or replace function get_upload(p_token uuid, p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions; v_image text;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up'); end if;
  select image into v_image from kid_uploads where id = p_id and family_id = s.family_id;
  if v_image is null then return jsonb_build_object('ok', false, 'error', 'That photo is gone'); end if;
  return jsonb_build_object('ok', true, 'image', v_image);
end $$;

-- Grown-up: done with a photo (read or not schoolwork)
create or replace function delete_upload(p_token uuid, p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s sessions;
begin
  select * into s from sessions where token = p_token and expires_at > now();
  if s.token is null or s.kid_id is not null then return jsonb_build_object('ok', false, 'error', 'Please log in as a grown-up'); end if;
  delete from kid_uploads where id = p_id and family_id = s.family_id;
  return jsonb_build_object('ok', true);
end $$;

revoke execute on function kid_upload(uuid, text, text), list_uploads(uuid), get_upload(uuid, bigint), delete_upload(uuid, bigint)
  from public, anon, authenticated;
grant execute on function kid_upload(uuid, text, text), list_uploads(uuid), get_upload(uuid, bigint), delete_upload(uuid, bigint) to anon;

notify pgrst, 'reload schema';
