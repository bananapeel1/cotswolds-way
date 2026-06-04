/**
 * Narrative parser — turns a Gemini-generated walk blurb into a sequence of
 * paragraph / bullet-list blocks suitable for rendering. Tolerant by design:
 * old paragraph-only cached narratives parse as a list of paragraph blocks
 * with no bullets; new bullet-and-paragraph narratives parse as both.
 *
 * Exports:
 *   parseNarrative(text)    — full block list (paragraphs + bullets), in
 *                             source order. Used by <RouteNarrative>.
 *   extractFirstBullet(text)— the first bullet's body (e.g. the "Shape"
 *                             line) for compact previews on candidate cards.
 *                             Returns null if the narrative has no bullets
 *                             (legacy paragraph-only format).
 */

export interface BulletItem {
  /** The label before a colon / em-dash / " - " separator. May be empty for
   *  bullets that lack a clear label. Bolded in the renderer. */
  label: string;
  /** Everything after the label separator. Falls back to the whole bullet
   *  when no separator was found. */
  body: string;
}

export type NarrativeBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: BulletItem[] };

/**
 * Split into blank-line-separated blocks. For each block: if every non-empty
 * line starts with "- " (Gemini's bullet marker), classify as a bullet list;
 * otherwise classify as a paragraph (collapsing internal newlines to spaces
 * so single newlines inside a paragraph don't render as line breaks).
 */
export function parseNarrative(narrative: string): NarrativeBlock[] {
  const trimmed = (narrative ?? "").trim();
  if (!trimmed) return [];
  const rawBlocks = trimmed.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  const out: NarrativeBlock[] = [];
  for (const block of rawBlocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines.every((l) => /^[-*•]\s+/.test(l))) {
      out.push({
        kind: "bullets",
        items: lines.map((l) => parseBullet(l)),
      });
    } else {
      out.push({ kind: "paragraph", text: lines.join(" ") });
    }
  }
  return out;
}

/**
 * Pull the body of the first bullet in the narrative — the "Shape" line in
 * the new format. Used by candidate cards to give each option a one-glance
 * fingerprint without re-rendering the whole narrative panel.
 *
 * Returns null when:
 *  - the narrative is empty;
 *  - it has no bullets (legacy paragraph-only format).
 */
export function extractFirstBullet(narrative: string | null | undefined): string | null {
  if (!narrative) return null;
  const blocks = parseNarrative(narrative);
  const firstBullets = blocks.find((b) => b.kind === "bullets");
  if (!firstBullets || firstBullets.items.length === 0) return null;
  const first = firstBullets.items[0];
  // Prefer the body without the label, which is the part that actually
  // distinguishes routes from each other.
  return first.body || first.label || null;
}

/**
 * Pull a bullet's "label" (the noun before a separator) and "body". Handles:
 *   "- Shape: Open downland and beech ribbons."
 *   "- Halfway — The Bell Inn at Cleeve, open Sundays."
 *   "- **Verdict**: A real pub walk."  (gemini occasionally markdown-bolds)
 *   "- Quiet woodland tracks all the way back."  (no label → empty label)
 */
function parseBullet(line: string): BulletItem {
  // Drop leading bullet marker + any markdown bold around the label.
  const stripped = line.replace(/^[-*•]\s+/, "").replace(/^\*\*\s*([^*]+?)\s*\*\*/, "$1");
  // Find the first label separator (colon, em-dash, en-dash, or " - ").
  // Capped to 30 chars so long sentences with mid-line colons aren't
  // misread as label/body. A label is "Shape", not "Open downland: rolling".
  const sepRe = /^([A-Za-z][A-Za-z ]{0,28}?)\s*(?::|—|–| - )\s*(.+)$/;
  const m = sepRe.exec(stripped);
  if (m) {
    return { label: m[1].trim(), body: m[2].trim() };
  }
  return { label: "", body: stripped };
}
