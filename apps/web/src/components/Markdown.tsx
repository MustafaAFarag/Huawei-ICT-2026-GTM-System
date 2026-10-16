"use client";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Parse Markdown into React elements. Raw HTML and remote images stay disabled.
export function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="chat-markdown" dir="auto">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ children, href }) =>
            !href ? (
              <span>{children}</span>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                dir="auto"
              >
                {children}
              </a>
            ),
          img: ({ alt }) => <span>{alt}</span>,
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
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
