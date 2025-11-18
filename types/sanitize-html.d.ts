declare module "sanitize-html" {
  import type { IOptions } from "sanitize-html";
  function sanitizeHtml(
    dirty: string,
    options?: IOptions
  ): string;
  export default sanitizeHtml;
}
