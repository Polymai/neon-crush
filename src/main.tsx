import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { GameProvider } from "./state/gameStore";
import { PlayerProvider } from "./state/playerStore";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PlayerProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </PlayerProvider>
  </React.StrictMode>,
);
