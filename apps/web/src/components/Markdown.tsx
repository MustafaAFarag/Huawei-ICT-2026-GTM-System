"use client";
import { memo, useMemo, useState, type ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { marked } from "marked";
import { IconCheck, IconCopy } from "@revenue/ui";
import { usePrefs } from "../lib/prefs";

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in node)
    return textOf((node.props as { children?: ReactNode }).children);
  return "";
}

function CodeBlock({ children }: { children: ReactNode }) {
  const { t } = usePrefs();
  const [copied, setCopied] = useState(false);
  return (
    <div className="code-block">
      <button
        type="button"
        className="icon-button code-copy"
        aria-label={copied ? t("Copied") : t("Copy code")}
        onClick={() => {
          void navigator.clipboard?.writeText(textOf(children)).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
      </button>
      <pre dir="ltr">{children}</pre>
    </div>
  );
}

// Raw HTML and remote images stay disabled: model text can never inject markup or trackers.
const COMPONENTS: Components = {
  a: ({ children, href }) =>
    !href ? (
      <span>{children}</span>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer" dir="auto">
        {children}
      </a>
    ),
  img: ({ alt }) => <span>{alt}</span>,
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  code: ({ children, className }) => (
    <code className={className} dir="ltr">
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="markdown-table">
      <table>{children}</table>
    </div>
  ),
  td: ({ children }) => (
    <td dir="auto">
      <bdi>{children}</bdi>
    </td>
  ),
  th: ({ children }) => (
    <th dir="auto">
      <bdi>{children}</bdi>
    </th>
  ),
};

const Block = memo(
  function Block({ text }: { text: string }) {
    return (
      <Markdown remarkPlugins={[remarkGfm]} skipHtml components={COMPONENTS}>
        {text}
      </Markdown>
    );
  },
  (a, b) => a.text === b.text,
);

// Closes Markdown left open mid-stream so a half-written bold, code span or fence renders
// as formatting instead of flashing literal markers.
export function closeOpenMarkdown(text: string) {
  let out = text;
  const fences = (out.match(/^```/gm) ?? []).length;
  if (fences % 2 === 1) return `${out}\n\`\`\``;
  const withoutCode = out.replace(/`[^`\n]*`/g, "");
  if ((withoutCode.match(/`/g) ?? []).length % 2 === 1) out += "`";
  if ((withoutCode.match(/\*\*/g) ?? []).length % 2 === 1) out += "**";
  // A table row still being typed renders once its closing pipe arrives.
  const lines = out.split("\n");
  const last = lines.at(-1) ?? "";
  if (/^\s*\|/.test(last) && !/\|\s*$/.test(last)) lines.pop();
  return lines.join("\n");
}

function splitBlocks(text: string) {
  try {
    return marked.lexer(text).map((token) => token.raw);
  } catch {
    return [text];
  }
}

// Completed blocks are memoized; only the block being written re-parses on each token.
export function ChatMarkdown({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  const blocks = useMemo(() => splitBlocks(text), [text]);
  return (
    <div className="chat-markdown" dir="auto">
      {blocks.map((block, index) =>
        block.trim() ? (
          <Block
            key={index}
            text={
              streaming && index === blocks.length - 1
                ? closeOpenMarkdown(block)
                : block
            }
          />
        ) : null,
      )}
    </div>
  );
}
