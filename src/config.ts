/** Where feedback goes by mail: set at build time (GitHub repository variable FEEDBACK_MAIL). */
export const AUTHOR_MAIL: string = import.meta.env.VITE_FEEDBACK_MAIL ?? "";

/** A mailto: link to the author, or "" when no address was set. */
export function mailTo(subject: string, body: string): string {
  return AUTHOR_MAIL ? `mailto:${AUTHOR_MAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : "";
}
