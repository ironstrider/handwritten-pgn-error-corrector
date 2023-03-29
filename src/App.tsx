import { batch, Component, createEffect, createSignal, For, Index, Match, mergeProps, on, Switch } from 'solid-js';
import { createStore, produce } from "solid-js/store";

import { Chess } from "chess.js";
import { Config, useChessground } from "solid-chessground";
import { Key } from 'chessground/types';

import "chessground/assets/chessground.base.css"
import "./assets/chessground.brown.css";
import "chessground/assets/chessground.cburnett.css"
import { move } from 'chessground/draw';
import { writeClipboard } from '@solid-primitives/clipboard';

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
  onDblClick?: (ev: MouseEvent) => void
}

const Move: Component<MoveProps> = (props) => {
  const merged = mergeProps({
    selected: false,
  }, props);
  return <div onDblClick={props.onDblClick} onClick={props.onClick} classList={{ "cursor-pointer": !!props.onClick, "bg-slate-100": merged.selected }}>
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
      if (state.moves[ply - 1].fen === null) {
        // find last valid move
        // @ts-ignore // TODO: investigate this
        let lastValid = state.moves.findLastIndex(move => move.fen !== null);
        setState("ply", lastValid + 1);
        return;
      }
      // out-of-bounds or invalid
      if (ply < 0 || ply > state.moves.length || state.moves[ply - 1].fen === null) {
        return;
      }

      setState("ply", ply);
    }
  }

  let moveTextPlaceholder = `e4 c5
Nf3 d6
d4 cxd4
Nxd4 Nf6
Nc3 a6`;

  let [pgnText, setPgnText] = createSignal(moveTextPlaceholder)

  let cgConfig: Config = {
    orientation: 'white',
    viewOnly: true,
  };
  let cg = useChessground();

  let validateMoves = (moves: MoveInfo[], startFrom: number) => {
    // assuming moves[startFrom] is valid

    let fen = startFrom === 0 ? state.initialFen : moves[startFrom - 1].fen;
    if (fen === null) {
      // move @ startFrom is not valid, so nothing to validate
      return { validMoves: 0 }
    }

    let chess = new Chess(fen!);

    let i;

    for (i = startFrom; i < moves.length; i++) {
      let move = moves[i];
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
    }

    // invalidate remaining moves
    for (let j = i; j < moves.length; j++) {
      let move = moves[j];
      move.fen = null;
      move.lastMove = null;
    }

    // TODO: mark state/first error?
    return {
      validMoves: i,
    }
  }

  let exportPgn = () => {
    // TODO: handle variable initialFen
    let result = [];

    for (let i = 0; i < state.moves.length; i++) {
      if (i % 2 === 0) {
        result.push(`${Math.floor(i / 2 + 1)}.`)
      }

      result.push(state.moves[i].san);
    }

    return result.join(" ")
  }

  let loadText = (moveText: string) => {
    let moves: MoveInfo[] = moveText.split(/\s+/g).map(san => {
      return { san, fen: null, lastMove: null }
    });

    let { validMoves } = validateMoves(moves, 0);

    batch(() => {
      setState("moves", moves);
      setState("ply", validMoves);
    })

  }

  let selectMove = (ply: number) => {
    setPly(ply);
  }

  createEffect(on([() => state.ply, () => state.moves], ([ply, moves]) => {
    // no need to validate here, since setPly performs validation
    if (ply === 0) {
      cg.api!.set({
        fen: state.initialFen,
        lastMove: undefined,
        // TODO: check etc.
      })
    } else {
      let move = moves[ply - 1];
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
        {/* TODO: disable prev @ start & next @ end */}
        <div class="w-full grid grid-cols-3 gap-2 p-2">
          <button onClick={() => { setPly(state.ply - 1) }} class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-sky-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">Prev</button>
          <button onClick={() => { setPly(state.ply + 1) }} class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-sky-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">Next</button>
          <button onClick={() => { writeClipboard(exportPgn()) }} class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-sky-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">Export PGN</button>
        </div>
        <div class="grid grid-cols-[min-content_1fr_1fr]">
          <MoveNumber num={null} />
          <div onClick={() => selectMove(0)} class="col-span-2 cursor-pointer" classList={{ "bg-slate-100": state.ply === 0 }}>
            <em>starting position</em>
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
              <Move onDblClick={() => {
                let newSan = prompt(`Change from ${move().san} to: `);
                if (!newSan) {
                  return;
                }

                setState(produce(s => {
                  s.moves[i].san = newSan!;
                  validateMoves(s.moves, i);
                  // TODO: auto-advance to next error? or just stay on the same move
                  s.ply = i + 1;
                }))
              }} san={move().san} state={moveState()} onClick={() => { selectMove(i + 1) }} selected={i + 1 === state.ply} />
            ];
          }}</Index>
        </div>
      </div>

      <div class="grid grid-rows-[min-content_1fr] col-span-2 h-44 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        <div>
          <button onClick={() => loadText(pgnText())} class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-2 focus:ring-sky-300 font-medium rounded-lg text-sm px-3 py-1.5 m-2 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">Load moves</button>
        </div>

        <textarea onInput={el => setPgnText(el.currentTarget.value)}
          class="block p-2.5 w-full text-sm text-gray-900 bg-white border-t border-gray-300 dark:border-gray-600 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300 dark:bg-gray-700 dark:placeholder-gray-400 dark:text-white dark:focus:ring-sky-300 dark:focus:border-sky-300"
        >
          {pgnText()}
        </textarea>
      </div>
    </div>
  )
}

export default App;
