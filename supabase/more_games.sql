-- =====================================================================
-- Step 43: 🎲 Two more family games: Dots and Boxes, and Battleship
-- Same as step 42: the server checks every move and decides who won.
-- Battleship ships are placed by the server and kept secret: each phone
-- only ever gets its own ships, plus the other player's ships once sunk.
-- Safe to run more than once.
-- =====================================================================
alter table family_games add column if not exists extra jsonb not null default '{}'::jsonb;   -- Battleship ships and shots
alter table family_games drop constraint if exists family_games_kind_check;
alter table family_games add constraint family_games_kind_check check (kind in ('ttt', 'c4', 'dots', 'bs'));

-- Battleship: 4 ships (4, 3, 3, 2 squares) placed at random on a 7×7 sea, no overlaps
create or replace function bs_fleet() returns jsonb
language plpgsql volatile as $$
declare v_taken int[] := '{}'; v_fleet jsonb := '[]'::jsonb; v_len int; v_ship int[]; r int; c int; down boolean; i int; tries int;
begin
  foreach v_len in array array[4, 3, 3, 2] loop
    tries := 0;
    loop
      tries := tries + 1;
      down := random() < 0.5;
      r := floor(random() * (case when down then 8 - v_len else 7 end));
      c := floor(random() * (case when down then 7 else 8 - v_len end));
      v_ship := '{}';
      for i in 0 .. v_len - 1 loop
        v_ship := v_ship || ((r + case when down then i else 0 end) * 7 + c + case when down then 0 else i end);
      end loop;
      exit when not (v_ship && v_taken) or tries > 200;
    end loop;
    v_taken := v_taken || v_ship;
    v_fleet := v_fleet || jsonb_build_array(to_jsonb(v_ship));
  end loop;
  return v_fleet;
end $$;

-- Battleship: the squares of the ships in a fleet that every shot has hit
create or replace function bs_sunk(p_fleet jsonb, p_shots jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_agg(s), '[]'::jsonb) from jsonb_array_elements(p_fleet) s
  where not exists (select 1 from jsonb_array_elements(s) x where not p_shots @> jsonb_build_array(x));
$$;

-- One game, the way the phone sees it (Battleship: never the other player's hidden ships)
create or replace function game_json(g family_games, p_me uuid) returns jsonb
language plpgsql security definer set search_path = public stable as $$
declare v_me int := case when g.p1 = p_me then 1 else 2 end; v_them int; v jsonb;
begin
  v_them := 3 - v_me;
  v := jsonb_build_object(
    'id', g.id, 'kind', g.kind, 'board', g.board, 'status', g.status, 'moves', g.moves, 'lastCell', g.last_cell,
    'me', v_me, 'turn', g.turn, 'winner', g.winner,
    'opponent', (select nickname from kids where id = case when v_me = 1 then g.p2 else g.p1 end),
    'opponentAnimal', (select animal from kids where id = case when v_me = 1 then g.p2 else g.p1 end),
    'updatedAt', g.updated_at);
  if g.kind = 'bs' then
    v := v || jsonb_build_object(
      'myFleet', g.extra -> ('fleet' || v_me),
      'myShots', g.extra -> ('shots' || v_me),                        -- where I fired
      'theirShots', g.extra -> ('shots' || v_them),                   -- where they fired at me
      'theirSunk', case when g.status = 'playing' then bs_sunk(g.extra -> ('fleet' || v_them), g.extra -> ('shots' || v_me))
                        else g.extra -> ('fleet' || v_them) end,      -- the whole fleet shows when the game is over
      'myHits', (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(g.extra -> ('shots' || v_me)) x
                 where exists (select 1 from jsonb_array_elements(g.extra -> ('fleet' || v_them)) s where s @> jsonb_build_array(x))));
  end if;
  return v;
end $$;

-- Start a game (or open the one already going with that person)
create or replace function game_new(p_token uuid, p_kind text, p_opponent text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me kids; v_other uuid; g family_games;
begin
  me := game_me(p_token);
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'Link this device to the family first'); end if;
  if p_kind not in ('ttt', 'c4', 'dots', 'bs') then return jsonb_build_object('ok', false, 'error', 'Unknown game'); end if;
  select id into v_other from kids where family_id = me.family_id and lower(nickname) = lower(btrim(p_opponent)) and id <> me.id;
  if v_other is null then return jsonb_build_object('ok', false, 'error', 'Pick someone in your family'); end if;
  select * into g from family_games where family_id = me.family_id and kind = p_kind and status = 'playing'
    and ((p1 = me.id and p2 = v_other) or (p1 = v_other and p2 = me.id)) limit 1;
  if g.id is not null then return jsonb_build_object('ok', true, 'existing', true, 'game', game_json(g, me.id)); end if;
  if (select count(*) from family_games where status = 'playing' and me.id in (p1, p2)) >= 8 then
    return jsonb_build_object('ok', false, 'error', 'You have 8 games going. Finish one first!');
  end if;
  insert into family_games (family_id, kind, p1, p2, board, extra)
  values (me.family_id, p_kind, me.id, v_other,
          case p_kind when 'ttt' then repeat('.', 9) when 'c4' then repeat('.', 42) when 'dots' then repeat('.', 61) else '' end,
          case when p_kind = 'bs' then jsonb_build_object('fleet1', bs_fleet(), 'fleet2', bs_fleet(), 'shots1', '[]'::jsonb, 'shots2', '[]'::jsonb)
               else '{}'::jsonb end)
  returning * into g;
  return jsonb_build_object('ok', true, 'existing', false, 'game', game_json(g, me.id));
end $$;

-- Make a move.
--   Tic-tac-toe: p_cell = square 0-8 · Connect Four: column 0-6
--   Dots and Boxes: p_cell = line 0-44 (0-19 across, 20-44 up and down); finishing a box = go again
--   Battleship: p_cell = square 0-48 to fire at
create or replace function game_move(p_token uuid, p_game uuid, p_cell int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me kids; g family_games; v_me int; v_mark text; v_spot int; v_rows int; v_cols int; v_need int; r int; c int;
        v_boxes int := 0; b int; v_shots jsonb; v_fleet jsonb; v_mine int; v_theirs int;
begin
  me := game_me(p_token);
  if me.id is null then return jsonb_build_object('ok', false, 'error', 'Link this device to the family first'); end if;
  select * into g from family_games where id = p_game and family_id = me.family_id for update;
  if g.id is null or me.id not in (g.p1, g.p2) then return jsonb_build_object('ok', false, 'error', 'Game not found'); end if;
  v_me := case when g.p1 = me.id then 1 else 2 end;
  if g.status <> 'playing' then return jsonb_build_object('ok', false, 'error', 'This game is over', 'game', game_json(g, me.id)); end if;
  if g.turn <> v_me then return jsonb_build_object('ok', false, 'error', 'Not your turn yet', 'game', game_json(g, me.id)); end if;
  v_mark := case when v_me = 1 then 'X' else 'O' end;

  if g.kind in ('ttt', 'c4') then
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
      for r in reverse 5 .. 0 loop
        if substr(g.board, r * 7 + p_cell + 1, 1) = '.' then v_spot := r * 7 + p_cell; exit; end if;
      end loop;
      if v_spot is null then return jsonb_build_object('ok', false, 'error', 'That column is full', 'game', game_json(g, me.id)); end if;
    end if;
    g.board := overlay(g.board placing v_mark from v_spot + 1 for 1);
    g.last_cell := v_spot;
    if game_line(g.board, v_rows, v_cols, v_need, v_mark) then g.status := 'won'; g.winner := v_me;
    elsif position('.' in g.board) = 0 then g.status := 'draw';
    else g.turn := 3 - v_me;
    end if;

  elsif g.kind = 'dots' then
    -- board = 45 lines ('.' or the player number) + 16 boxes ('.' or the owner's number)
    if p_cell is null or p_cell < 0 or p_cell > 44 or substr(g.board, p_cell + 1, 1) <> '.' then
      return jsonb_build_object('ok', false, 'error', 'Pick a line that isn''t drawn yet', 'game', game_json(g, me.id));
    end if;
    g.board := overlay(g.board placing v_me::text from p_cell + 1 for 1);
    g.last_cell := p_cell;
    for r in 0 .. 3 loop
      for c in 0 .. 3 loop
        b := 45 + r * 4 + c;
        if substr(g.board, b + 1, 1) = '.'
           and substr(g.board, r * 4 + c + 1, 1) <> '.'                -- top
           and substr(g.board, (r + 1) * 4 + c + 1, 1) <> '.'          -- bottom
           and substr(g.board, 20 + r * 5 + c + 1, 1) <> '.'           -- left
           and substr(g.board, 20 + r * 5 + c + 2, 1) <> '.' then      -- right
          g.board := overlay(g.board placing v_me::text from b + 1 for 1);
          v_boxes := v_boxes + 1;
        end if;
      end loop;
    end loop;
    if position('.' in substr(g.board, 1, 45)) = 0 then              -- every line drawn: most boxes wins
      v_mine := length(substr(g.board, 46)) - length(replace(substr(g.board, 46), v_me::text, ''));
      v_theirs := 16 - v_mine;
      if v_mine = v_theirs then g.status := 'draw';
      else g.status := 'won'; g.winner := case when v_mine > v_theirs then v_me else 3 - v_me end;
      end if;
    elsif v_boxes = 0 then
      g.turn := 3 - v_me;                                             -- finished a box = go again
    end if;

  else  -- Battleship
    v_shots := g.extra -> ('shots' || v_me);
    if p_cell is null or p_cell < 0 or p_cell > 48 or v_shots @> jsonb_build_array(p_cell) then
      return jsonb_build_object('ok', false, 'error', 'Pick a square you haven''t fired at', 'game', game_json(g, me.id));
    end if;
    v_shots := v_shots || jsonb_build_array(p_cell);
    g.extra := jsonb_set(g.extra, array['shots' || v_me], v_shots);
    g.last_cell := p_cell;
    v_fleet := g.extra -> ('fleet' || (3 - v_me));
    if jsonb_array_length(bs_sunk(v_fleet, v_shots)) = jsonb_array_length(v_fleet) then
      g.status := 'won'; g.winner := v_me;
    else
      g.turn := 3 - v_me;
    end if;
  end if;

  g.moves := g.moves + 1;
  update family_games set board = g.board, extra = g.extra, moves = g.moves, last_cell = g.last_cell, status = g.status,
                          winner = g.winner, turn = g.turn, updated_at = now()
  where id = g.id returning * into g;
  return jsonb_build_object('ok', true, 'game', game_json(g, me.id));
end $$;

revoke execute on function bs_fleet(), bs_sunk(jsonb, jsonb), game_json(family_games, uuid) from public, anon, authenticated;
revoke execute on function game_new(uuid, text, text), game_move(uuid, uuid, int) from public;
grant execute on function game_new(uuid, text, text), game_move(uuid, uuid, int) to anon;

notify pgrst, 'reload schema';
