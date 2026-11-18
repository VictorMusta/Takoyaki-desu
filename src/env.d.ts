/** package.json version, set at build time. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Address for « Envoyer par mail » in the feedback screen (empty: button hidden). */
  readonly VITE_FEEDBACK_MAIL?: string;
}
