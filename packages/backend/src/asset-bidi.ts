import { parse, serialize, type DefaultTreeAdapterMap } from "parse5";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
const isElement = (node: Node): node is Element => "tagName" in node;
const get = (node: Element, name: string) =>
  node.attrs.find((a) => a.name === name)?.value;
function set(node: Element, name: string, value: string) {
  const attribute = node.attrs.find((a) => a.name === name);
  if (attribute) attribute.value = value;
  else node.attrs.push({ name, value });
}
const blocks = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "td",
  "th",
  "figcaption",
]);
const skip = new Set(["head", "style", "script", "bdi", "code", "pre", "svg"]);

// dir=auto turns a whole Arabic sentence LTR when its first word is a company
// name. Keep document paragraphs explicit and isolate Latin/numeric runs instead.
// A DOM parser keeps attributes, URLs, font CSS and escaped text untouched.
export function normalizeAssetBidi(html: string, language?: string): string {
  const document = parse(html);
  const root = document.childNodes.find(
    (n): n is Element => isElement(n) && n.tagName === "html",
  )!;
  const rtl = language ? language.startsWith("ar") : get(root, "dir") === "rtl";
  set(root, "dir", rtl ? "rtl" : "ltr");
  set(root, "lang", rtl ? "ar" : "en");
  set(root, "data-bidi-version", "1");
  function visit(node: Node) {
    if (isElement(node)) {
      if (skip.has(node.tagName)) return;
      if (blocks.has(node.tagName)) set(node, "dir", rtl ? "rtl" : "ltr");
      if (node.tagName === "a") set(node, "dir", "ltr");
    }
    if (!("childNodes" in node)) return;
    for (const child of [...node.childNodes]) {
      if (child.nodeName === "#text" && rtl && "value" in child) {
        const value = child.value;
        const pattern = /[+-]?[A-Za-z0-9][A-Za-z0-9@:/?&=._%+#,'() \u2013-]*/g;
        const replacements: Node[] = [];
        let offset = 0;
        for (const match of value.matchAll(pattern)) {
          const token = match[0].trimEnd();
          const start = match.index!;
          if (start > offset)
            replacements.push({
              nodeName: "#text",
              value: value.slice(offset, start),
              parentNode: node,
            });
          const isolate: Element = {
            nodeName: "bdi",
            tagName: "bdi",
            namespaceURI:
              "http://www.w3.org/1999/xhtml" as Element["namespaceURI"],
            attrs: [{ name: "dir", value: "ltr" }],
            childNodes: [],
            parentNode: node,
          };
          isolate.childNodes.push({
            nodeName: "#text",
            value: token,
            parentNode: isolate,
          });
          replacements.push(isolate);
          offset = start + token.length;
        }
        if (replacements.length) {
          if (offset < value.length)
            replacements.push({
              nodeName: "#text",
              value: value.slice(offset),
              parentNode: node,
            });
          node.childNodes.splice(
            node.childNodes.indexOf(child),
            1,
            ...(replacements as typeof node.childNodes),
          );
        }
      } else visit(child);
    }
  }
  visit(root);
  const elements: Element[] = [];
  const collect = (node: Node) => {
    if (isElement(node)) elements.push(node);
    if ("childNodes" in node) node.childNodes.forEach(collect);
  };
  collect(root);
  const heading = elements.find((node) => node.tagName === "h1");
  const title = elements.find((node) => node.tagName === "title");
  const textOf = (node: Node): string =>
    "value" in node
      ? node.value
      : "childNodes" in node
        ? node.childNodes.map(textOf).join("")
        : "";
  if (heading && title)
    title.childNodes = [
      { nodeName: "#text", value: textOf(heading), parentNode: title },
    ];
  const head = root.childNodes.find(
    (n): n is Element => isElement(n) && n.tagName === "head",
  )!;
  if (
    head.childNodes.some(
      (n) => isElement(n) && get(n, "data-bidi-style") === "1",
    )
  )
    return serialize(document);
  const style: Element = {
    nodeName: "style",
    tagName: "style",
    namespaceURI: root.namespaceURI,
    attrs: [{ name: "data-bidi-style", value: "1" }],
    childNodes: [],
    parentNode: head,
  };
  style.childNodes.push({
    nodeName: "#text",
    value:
      'bdi,[dir="ltr"]{unicode-bidi:isolate}p,h1,h2,h3,h4,h5,h6,li,td,th{ text-align:start }a{overflow-wrap:anywhere}',
    parentNode: style,
  });
  head.childNodes.push(style);
  return serialize(document);
}
