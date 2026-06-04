/**
 * RouteNarrative — renders a Gemini-generated walk blurb.
 *
 * Two formats are supported transparently:
 *
 *   1. New (post-bullets refactor): a sequence of "- Label: body" bullet
 *      lines, then a blank line, then one short atmosphere paragraph.
 *
 *   2. Legacy (pre-refactor cached rows): two or three paragraph blocks
 *      separated by blank lines, no bullets at all.
 *
 * The parser splits on blank lines and decides per block whether it's a
 * bullet list (every non-empty line starts with `- `) or a paragraph. That
 * way old cached narratives keep rendering correctly — no backfill needed.
 *
 * Bullet labels: the prompt asks Gemini to emit "Shape", "Best for",
 * "Halfway", "Heads up", "Verdict" — but we bold whatever it actually puts
 * before the first colon, em-dash, or " - " separator. Tolerant by design;
 * the label rendering is cosmetic, not load-bearing.
 */

import { parseNarrative } from "@/lib/narrative";

export default function RouteNarrative({
  narrative,
  className,
}: {
  narrative: string;
  className?: string;
}) {
  const blocks = parseNarrative(narrative);
  if (blocks.length === 0) return null;

  return (
    <div
      className={`space-y-3 text-sm leading-relaxed text-on-surface ${className ?? ""}`}
    >
      {blocks.map((block, i) =>
        block.kind === "bullets" ? (
          <ul key={i} className="space-y-1.5">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="mt-[0.55em] block h-1 w-1 shrink-0 rounded-full bg-secondary"
                />
                <span>
                  {item.label && (
                    <span className="font-semibold text-on-surface">
                      {item.label}
                      <span className="text-on-surface-variant">: </span>
                    </span>
                  )}
                  <span className="text-on-surface/90">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="text-on-surface/90">
            {block.text}
          </p>
        ),
      )}
    </div>
  );
}
