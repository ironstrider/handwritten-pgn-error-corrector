import { Component, createSignal, For } from 'solid-js';

const App: Component = () => {
  let [moves, setMoves] = createSignal([] as string[]);

  let addMoves = (moveText: string) => {
    setMoves(moves => [...moves, ...moveText.split(/\s+/g)])
  }

  return (
    <div class="dislay: grid; grid-template-columns: auto;">
      <div style="display: grid; grid-template-columns: auto auto auto; grid-column-gap: 2em;">
        <For each={moves()}>
          {(move, index) => {

            let i = index();

            if (i % 2 === 1) {
              return <span>{move}</span>
            } else {
              return <>
                <span>{Math.floor(i / 2 + 1)}. </span>
                <span>{move}</span>
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
