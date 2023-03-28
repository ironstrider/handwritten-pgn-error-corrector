import { Component, createSignal, For, Index, Match, Switch } from 'solid-js';
import { createStore } from "solid-js/store";

import { Chess } from "chess.js";
import { Config, useChessground } from "solid-chessground";

import "chessground/assets/chessground.base.css"
// the included colour theme is quite ugly :/
import "chessground/assets/chessground.brown.css"
import "chessground/assets/chessground.cburnett.css"

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
}

enum MoveState {
  Ok = 'ok',
  FirstError = 'first-error',
  Unknown = 'unknown',
}

interface MoveProps {
  san: string,
  state: MoveState,
  onClick?: (ev: MouseEvent) => void
}

const Move: Component<MoveProps> = (props) => {
  return <div onClick={props.onClick}>
    {props.san}
    <Switch fallback="?">
      <Match when={props.state === MoveState.Ok}>✔️</Match>
      <Match when={props.state === MoveState.FirstError}>❌</Match>
    </Switch>
  </div>
}

const App: Component = () => {
  let initialFen = (new Chess()).fen();
  let [state, setState] = createStore({
    moves: [] as MoveInfo[]
  });

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
      return { san, fen: null }
    });

    let chess = new Chess();

    for (const move of moves) {
      let res;
      try {
        res = chess.move(move.san);
      } catch (e) {
        // invalid move
        break;
      }

      move.fen = res.after;
    }

    setState("moves", moves);
  }

  let selectMove = (ply: number) => {
    let fen: string;
    if (ply === 0) {
      fen = initialFen;
    } else {
      let move = state.moves[ply - 1];
      if (move.fen !== null) {
        fen = move.fen;
      } else {
        return;
      }
    }

    cg.api!.set({
      fen,
    });
  }

  return (
    <div>
      <div style="width: 400px; aspect-ratio: 1/1" ref={el => cg.mount(el, cgConfig)}></div>

      <div>
        <h3>Moves</h3>
        <Move san="@start@" state={MoveState.Ok} onClick={() => { selectMove(0) }} />
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

          return <Move san={move().san} state={moveState()} onClick={() => { selectMove(i + 1) }} />
        }}</Index>
      </div>

      <div>
        <button onClick={() => loadText(pgnText())}>Load text</button>
      </div>

      <textarea style="width: 500px;" rows={10} onInput={el => setPgnText(el.currentTarget.value)}>
        {pgnText()}
      </textarea>

    </div>
  )
}

export default App;
