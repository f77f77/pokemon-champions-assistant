/// <reference types="vite/client" />

interface PkmnBridge {
  platform: string;
  versions: { node: string; chrome: string; electron: string };
}

interface Window {
  pkmnBridge?: PkmnBridge;
}
