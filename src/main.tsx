import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { loadGeneratedSpeciesData } from "./lib/species";

async function boot() {
  // Overlay 繁中 names / classic base stats from public/data/pokemon.json when present.
  await loadGeneratedSpeciesData();
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void boot();
