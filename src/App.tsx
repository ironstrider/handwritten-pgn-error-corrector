import { Component, createSignal, For } from 'solid-js';

import { Chess } from "chess.js";

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

const App: Component = () => {
  let initialFen = (new Chess()).fen();
  let [fen, setFen] = createSignal(initialFen);
  let [moves, setMoves] = createSignal([] as string[]);

  let addMoves = (moveText: string) => {
    setMoves(moves => {
      let newMoves = [...moves, ...moveText.split(/\s+/g)];

      console.log('valid moves', checkMoves(newMoves));

      return newMoves;
    })
  }

  let selectMove = (ply: number) => {
    let validMoves = checkMoves(moves());
    setFen(validMoves[ply].after)
  }

  return (
    <div class="dislay: grid; grid-template-columns: auto;">
      <code>Fen: {fen()}</code>
      <div style="display: grid; grid-template-columns: auto auto auto; grid-column-gap: 2em;">
        <span></span>
        <span onClick={() => { setFen(initialFen) }} style="grid-column: span 2"><em>Start</em></span>
        <For each={moves()}>
          {(move, index) => {

            let i = index();

            if (i % 2 === 1) {
              return <span onClick={() => selectMove(i)}>{move}</span>
            } else {
              return <>
                <span>{Math.floor(i / 2 + 1)}. </span>
                <span onClick={() => selectMove(i)}>{move}</span>
              </>
            }


          }}
        </For>
      </div>


      <textarea style="width: 50%; margin: 3em auto; min-height: 300px;" onKeyDown={(ev) => {
        if (ev.key === "Enter") {
          addMoves(ev.currentTarget.value);
          ev.currentTarget.value = "";
          ev.preventDefault();
        }
      }}></textarea>
    </div>
  );
};

export default App;
