-- =====================================================================
-- Step 42: 🎲 Family games (tic-tac-toe and Connect Four)
-- Anyone in the family plays anyone else from their own phone, one move
-- at a time. The server checks every move and decides who won, so nobody
-- can cheat by changing their phone. Safe to run more than once.
-- =====================================================================
create table if not exists family_games (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  kind text not null check (kind in ('ttt', 'c4')),
  p1 uuid not null references kids(id) on delete cascade,     -- started the game, plays ❌ / 🔴, moves first
  p2 uuid not null references kids(id) on delete cascade,     -- plays ⭕ / 🟡
  turn smallint not null default 1,                            -- 1 or 2: whose move it is
  board text not null,
  status text not null default 'playing' check (status in ('playing', 'won', 'draw', 'resigned')),
  winner smallint,                                             -- 1 or 2
  last_cell smallint,
  moves int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists family_games_players on family_games (family_id, updated_at desc);
alter table family_games enable row level security;           -- only the functions below can reach it

-- A kid's (or career-mode grown-up's) login
create or replace function game_me(p_token uuid) returns kids
language sql security definer set search_path = public stable as $$
  select k.* from sessions s join kids k on k.id = s.kid_id
  where s.token = p_token and s.expires_at > now() and s.kid_id is not null;
$$;

-- One game, the way the phone sees it
create or replace function game_json(g family_games, p_me uuid) returns jsonb
language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'id', g.id, 'kind', g.kind, 'board', g.board, 'status', g.status, 'moves', g.moves, 'lastCell', g.last_cell,
    'me', case when g.p1 = p_me then 1 else 2 end,
    'turn', g.turn, 'winner', g.winner,
    'opponent', (select nickname from kids where id = case when g.p1 = p_me then g.p2 else g.p1 end),
    'opponentAnimal', (select animal from kids where id = case when g.p1 = p_me then g.p2 else g.p1 end),
    'updatedAt', g.updated_at);
$$;

-- Did the last mark make a line? (3 in a row on a 3×3 board, 4 in a row on 6×7)
create or replace function game_line(p_board text, p_rows int, p_cols int, p_need int, p_mark text) returns boolean
language plpgsql immutable as $$
declare r int; c int; d int; n int; dr int[] := array[0, 1, 1, 1]; dc int[] := array[1, 0, 1, -1];
begin
  for r in 0 .. p_rows - 1 loop
    for c in 0 .. p_cols - 1 loop
      for d in 1 .. 4 loop
        n := 0;
        while n < p_need
          and r + dr[d] * n between 0 and p_rows - 1
          and c + dc[d] * n between 0 and p_cols - 1
          and substr(p_board, (r + dr[d] * n) * p_cols + (c + dc[d] * n) + 1, 1) = p_mark loop
          n := n + 1;
        end loop;
        if n = p_need then return true; end if;
      end loop;
    end loop;
  end loop;
  return false;
end $$;

-- My games and who I can challenge
create or replace function game_list(p_token uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me kids;
begin
  me := game_me(p_token);
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'Link this device to the family first'); end if;
  delete from family_games where family_id = me.family_id and status <> 'playing' and updated_at < now() - interval '14 days';
  delete from family_games where family_id = me.family_id and status = 'playing' and updated_at < now() - interval '30 days';
  return jsonb_build_object('ok', true, 'me', me.nickname,
    'family', (select coalesce(jsonb_agg(jsonb_build_object('nickname', k.nickname, 'animal', k.animal) order by k.created_at), '[]'::jsonb)
               from kids k where k.family_id = me.family_id and k.id <> me.id),
    'games', (select coalesce(jsonb_agg(game_json(g, me.id) order by g.updated_at desc), '[]'::jsonb)
              from (select * from family_games g where g.family_id = me.family_id and me.id in (g.p1, g.p2)
                    order by g.updated_at desc limit 20) g));
end $$;

-- Start a game (or open the one already going with that person)
create or replace function game_new(p_token uuid, p_kind text, p_opponent text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me kids; v_other uuid; g family_games;
begin
  me := game_me(p_token);
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'Link this device to the family first'); end if;
  if p_kind not in ('ttt', 'c4') then return jsonb_build_object('ok', false, 'error', 'Unknown game'); end if;
  select id into v_other from kids where family_id = me.family_id and lower(nickname) = lower(btrim(p_opponent)) and id <> me.id;
  if v_other is null then return jsonb_build_object('ok', false, 'error', 'Pick someone in your family'); end if;
  select * into g from family_games where family_id = me.family_id and kind = p_kind and status = 'playing'
    and ((p1 = me.id and p2 = v_other) or (p1 = v_other and p2 = me.id)) limit 1;
  if g.id is not null then return jsonb_build_object('ok', true, 'existing', true, 'game', game_json(g, me.id)); end if;
  if (select count(*) from family_games where status = 'playing' and me.id in (p1, p2)) >= 8 then
    return jsonb_build_object('ok', false, 'error', 'You have 8 games going. Finish one first!');
  end if;
  insert into family_games (family_id, kind, p1, p2, board)
  values (me.family_id, p_kind, me.id, v_other, repeat('.', case when p_kind = 'ttt' then 9 else 42 end))
  returning * into g;
  return jsonb_build_object('ok', true, 'existing', false, 'game', game_json(g, me.id));
end $$;

-- Make a move. Tic-tac-toe: p_cell is the square (0-8). Connect Four: p_cell is the column (0-6).
create or replace function game_move(p_token uuid, p_game uuid, p_cell int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me kids; g family_games; v_me int; v_mark text; v_spot int; v_rows int; v_cols int; v_need int; r int;
begin
  me := game_me(p_token);
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'Link this device to the family first'); end if;
  select * into g from family_games where id = p_game and family_id = me.family_id for update;
  if g.id is null or me.id not in (g.p1, g.p2) then return jsonb_build_object('ok', false, 'error', 'Game not found'); end if;
  v_me := case when g.p1 = me.id then 1 else 2 end;
  if g.status <> 'playing' then return jsonb_build_object('ok', false, 'error', 'This game is over', 'game', game_json(g, me.id)); end if;
  if g.turn <> v_me then return jsonb_build_object('ok', false, 'error', 'Not your turn yet', 'game', game_json(g, me.id)); end if;
  v_mark := case when v_me = 1 then 'X' else 'O' end;
  if g.kind = 'ttt' then
    v_rows := 3; v_cols := 3; v_need := 3;
    if p_cell is null or p_cell < 0 or p_cell > 8 or substr(g.board, p_cell + 1, 1) <> '.' then
      return jsonb_build_object('ok', false, 'error', 'Pick an empty square', 'game', game_json(g, me.id));
    end if;
    v_spot := p_cell;
  else
    v_rows := 6; v_cols := 7; v_need := 4;
    if p_cell is null or p_cell < 0 or p_cell > 6 then return jsonb_build_object('ok', false, 'error', 'Pick a column'); end if;
    v_spot := null;
    for r in reverse 5 .. 0 loop                                -- drops to the lowest empty spot
      if substr(g.board, r * 7 + p_cell + 1, 1) = '.' then v_spot := r * 7 + p_cell; exit; end if;
    end loop;
    if v_spot is null then return jsonb_build_object('ok', false, 'error', 'That column is full', 'game', game_json(g, me.id)); end if;
  end if;
  g.board := overlay(g.board placing v_mark from v_spot + 1 for 1);
  g.moves := g.moves + 1;
  g.last_cell := v_spot;
  if game_line(g.board, v_rows, v_cols, v_need, v_mark) then
    g.status := 'won'; g.winner := v_me;
  elsif position('.' in g.board) = 0 then
    g.status := 'draw';
  else
    g.turn := 3 - v_me;
  end if;
  update family_games set board = g.board, moves = g.moves, last_cell = g.last_cell, status = g.status, winner = g.winner,
                          turn = g.turn, updated_at = now()
  where id = g.id returning * into g;
  return jsonb_build_object('ok', true, 'game', game_json(g, me.id));
end $$;

create or replace function game_resign(p_token uuid, p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me kids; g family_games;
begin
  me := game_me(p_token);
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'Link this device to the family first'); end if;
  update family_games set status = 'resigned', winner = case when p1 = me.id then 2 else 1 end, updated_at = now()
  where id = p_game and family_id = me.family_id and me.id in (p1, p2) and status = 'playing'
  returning * into g;
  if g.id is null then return jsonb_build_object('ok', false, 'error', 'Game not found'); end if;
  return jsonb_build_object('ok', true, 'game', game_json(g, me.id));
end $$;

revoke execute on function game_me(uuid), game_json(family_games, uuid) from public, anon, authenticated;
revoke execute on function game_list(uuid), game_new(uuid, text, text), game_move(uuid, uuid, int), game_resign(uuid, uuid) from public;
grant execute on function game_list(uuid), game_new(uuid, text, text), game_move(uuid, uuid, int), game_resign(uuid, uuid) to anon;

notify pgrst, 'reload schema';
