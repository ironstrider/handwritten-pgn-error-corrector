import { batch, Component, createEffect, createSignal, For, Index, Match, mergeProps, on, Switch } from 'solid-js';
import { createStore } from "solid-js/store";

import { Chess } from "chess.js";
import { Config, useChessground } from "solid-chessground";

import "chessground/assets/chessground.base.css"
import "./assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css"
import { Key } from 'chessground/types';

function checkMoves(moves: string[]) {
  let chess = new Chess();

  let result = [];

  for (let [ply, move] of moves.entries()) {
    try {
      result.push(chess.move(move));
    } catch (e) {
      // invalid move
      break;
    }
  }

  return result;
}

interface MoveInfo {
  san: string,
  fen: string | null,
  lastMove: [string, string] | null
}

enum MoveState {
  Ok = 'ok',
  FirstError = 'first-error',
  Unknown = 'unknown',
}

interface MoveProps {
  san: string,
  state: MoveState,
  selected: boolean,
  onClick?: (ev: MouseEvent) => void
}

const Move: Component<MoveProps> = (props) => {
  const merged = mergeProps({
    selected: false,
  }, props);
  return <div onClick={props.onClick} classList={{ "cursor-pointer": !!props.onClick, "bg-slate-100": merged.selected }}>
    {props.san}
    <Switch fallback="?">
      <Match when={props.state === MoveState.Ok}>✔️</Match>
      <Match when={props.state === MoveState.FirstError}>❌</Match>
    </Switch>
  </div>
}

const MoveNumber: Component<{ num: number | string | null }> = (props) => {
  return <div class="text-right px-2">{props.num}</div>
}

const App: Component = () => {
  let [state, setState] = createStore({
    moves: [] as MoveInfo[],
    ply: 0,
    initialFen: (new Chess()).fen()
  });

  let setPly = (ply: number) => {
    // validate that move for given ply both exists and is valid
    if (ply === 0) {
      setState("ply", 0);
    } else {
      // out-of-bounds or invalid
      if (ply > state.moves.length || state.moves[ply - 1].fen === null) {
        return;
      }

      setState("ply", ply);
    }
  }

  let [pgnText, setPgnText] = createSignal(`e4 c5
Nf3 d6
d4 cxd4
Nxd4 Nf6
Nc3 a6
Be3`)

  let cgConfig: Config = {
    orientation: 'white',
    viewOnly: true,
  };
  let cg = useChessground();

  let loadText = (moveText: string) => {
    let moves: MoveInfo[] = moveText.split(/\s+/g).map(san => {
      return { san, fen: null, lastMove: null }
    });

    let chess = new Chess();

    let validMoves = 0;

    for (const move of moves) {
      let res;
      try {
        res = chess.move(move.san);
      } catch (e) {
        // invalid move
        // move.state = MoveState.FirstError;
        break;
      }

      move.fen = res.after;
      move.lastMove = [res.from, res.to];

      validMoves += 1;
    }

    batch(() => {
      setState("moves", moves);
      setState("ply", validMoves);
    })

  }

  let selectMove = (ply: number) => {
    setPly(ply);
  }

  createEffect(on(() => state.ply, (ply) => {
    // no need to validate here, since setPly performs validation
    if (ply === 0) {
      cg.api!.set({
        fen: state.initialFen,
        lastMove: undefined,
        // TODO: check etc.
      })
    } else {
      let move = state.moves[ply - 1];
      cg.api!.set({
        fen: move.fen!,
        lastMove: move.lastMove as Key[]
        // TODO: check etc.
      })
    }
  }));

  return (
    <div class="grid grid-cols-[3fr_1fr] gap-4 p-4">
      <div class="bg-stone-300">
        <div style="width: 100%; aspect-ratio: 1/1" ref={el => cg.mount(el, cgConfig)}></div>
      </div>

      <div>
        <div class="grid grid-cols-[min-content_1fr_1fr]">
          <MoveNumber num={null} />
          <div onClick={() => selectMove(0)} class="col-span-2" classList={{ "bg-slate-100": state.ply === 0 }}>
            <em>start</em>
          </div>
          <Index each={state.moves}>{(move, i) => {
            let moveState = () => {
              if (move().fen !== null) {
                return MoveState.Ok;
              } else if (i === 0 || state.moves[i - 1].fen !== null) {
                return MoveState.FirstError;
              } else {
                return MoveState.Unknown;
              }
            };

            return [
              i % 2 === 0 && <MoveNumber num={Math.floor(i / 2 + 1)} />,
              <Move san={move().san} state={moveState()} onClick={() => { selectMove(i + 1) }} selected={i + 1 === state.ply} />
            ];
          }}</Index>
        </div>
      </div>

      <div class="col-span-2">
        <div>
          <button onClick={() => loadText(pgnText())}>Load text</button>
        </div>

        <textarea rows={10} onInput={el => setPgnText(el.currentTarget.value)}>
          {pgnText()}
        </textarea>
      </div>
    </div>
  )
}

export default App;
