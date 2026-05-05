"use client"

import "katex/dist/katex.min.css"
import katex from "katex"

type Segment =
  | { type: "text"; content: string }
  | { type: "inline"; content: string }
  | { type: "display"; content: string }

/**
 * Split a string into alternating text / math segments.
 * Supports:  $$...$$  $...$  \[...\]  \(...\)
 */
function parseSegments(raw: string): Segment[] {
  const segments: Segment[] = []

  // Order matters: match $$ before $ to avoid partial matches.
  const pattern =
    /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^\n$]+?)\$|\\\(([^\n]+?)\\\)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(raw)) !== null) {
    // Text before this match
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: raw.slice(lastIndex, match.index) })
    }

    const display = match[1] ?? match[2] // $$ or \[
    const inline = match[3] ?? match[4]  // $  or \(

    if (display !== undefined) {
      segments.push({ type: "display", content: display.trim() })
    } else if (inline !== undefined) {
      segments.push({ type: "inline", content: inline.trim() })
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text after last match
  if (lastIndex < raw.length) {
    segments.push({ type: "text", content: raw.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: "text", content: raw }]
}

function renderKatex(latex: string, display: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode: display,
      throwOnError: false,
      strict: false,
      trust: true,
      macros: {
        "\\vec": "\\overrightarrow",
      },
    })
  } catch {
    return latex
  }
}

export function MathText({ text, className }: { text: string; className?: string }) {
  if (!text) return null

  const segments = parseSegments(text)

  return (
    <span className={className} style={{ whiteSpace: "pre-wrap" }}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <span key={i}>{seg.content}</span>
        }

        const html = renderKatex(seg.content, seg.type === "display")

        if (seg.type === "display") {
          return (
            <span
              key={i}
              className="block text-center my-3"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        }

        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )
      })}
    </span>
  )
}
