/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the API. Defaults to '/api' behind the dev proxy. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
