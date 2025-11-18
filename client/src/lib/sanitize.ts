import DOMPurify, { type Config } from "dompurify";

const defaultConfig: Config = {
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data):|#)/i,
  ADD_ATTR: ["target", "rel", "class", "aria-label", "aria-hidden"],
  ADD_TAGS: ["iframe"],
  RETURN_DOM: false,
};

export function sanitizeClientHtml(content: string): string {
  if (!content) {
    return "";
  }
  return DOMPurify.sanitize(content, defaultConfig);
}
