import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p",
  "span",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "img",
  "a",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "video",
  "source",
  "audio",
];

const allowedAttributes = {
  a: ["href", "target", "rel", "title"],
  img: ["src", "alt", "title", "loading", "width", "height"],
  video: ["controls", "poster", "preload", "width", "height"],
  audio: ["controls", "preload"],
  source: ["src", "type"],
  "*": ["style", "class", "data-*", "aria-label", "aria-hidden"],
};

const allowedStyles = {
  "*": {
    color: [/^#[0-9a-fA-F]{3,6}$/, /^rgb\((\s*\d+\s*,?){3}\)$/],
    "background-color": [/^#[0-9a-fA-F]{3,6}$/, /^rgb\((\s*\d+\s*,?){3}\)$/],
    "text-align": [/^(left|right|center|justify)$/],
    "font-size": [/^\d+(px|em|rem|%)$/],
    "font-family": [/^[A-Za-z0-9 ,'"-]+$/],
    "font-weight": [/^(normal|bold|bolder|lighter|[1-9]00)$/],
  },
};

export function sanitizeRichText(content: string): string {
  if (!content) {
    return "";
  }

  return sanitizeHtml(content, {
    allowedTags,
    allowedAttributes,
    allowedStyles,
    allowedSchemes: ["http", "https", "mailto", "tel", "data"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
    },
    enforceHtmlBoundary: true,
    disallowedTagsMode: "discard",
  });
}
