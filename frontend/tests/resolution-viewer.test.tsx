import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResolutionTrace } from "@features/resolution-viewer";
import type { Clause, DerivationTrace } from "@shared/api/types";

function makeClause(raw: string): Clause {
  return {
    id: raw,
    literals: [],
    raw,
    goalRelated: false,
    source: { kind: "kb", line: 0 },
  };
}

const trace: DerivationTrace = {
  verdict: true,
  stepLimit: 1000,
  stepLimitReached: false,
  kbClauses: [],
  goalClause: null,
  transcript: ["Step 1: resolved P and ¬P.", "Verdict: entailed."],
  steps: [
    {
      index: 1,
      parents: [makeClause("P"), makeClause("¬P")],
      resolvent: null,
      resolvedOn: "P",
      isEmptyClause: true,
      explanation: "Clause 1 and Clause 2 share P with opposite signs.",
    },
  ],
};

/** Finds the nearest ancestor <div> of `el` whose className contains
 * `marker` - used to reach a wrapper div in ResolutionTrace.tsx without
 * depending on its exact DOM nesting depth. */
function ancestorWithClass(el: Element, marker: string): HTMLElement {
  let node: Element | null = el;
  while (node) {
    if (node.className?.toString().includes(marker)) return node as HTMLElement;
    node = node.parentElement;
  }
  throw new Error(`No ancestor with class containing "${marker}"`);
}

describe("ResolutionTrace fullscreen layout", () => {
  it("gives the full-tree view full width, but keeps list/tree/transcript at max-w-4xl", () => {
    render(<ResolutionTrace trace={trace} traceIndex={0} onTraceIndexChange={() => {}} />);

    fireEvent.click(screen.getByLabelText("Expand resolution trace"));
    fireEvent.click(screen.getByLabelText("Show full tree"));

    const fullTreeContentEl = screen.getByLabelText("Zoom in");
    const fullTreeWrapper = ancestorWithClass(fullTreeContentEl, "flex-1 flex-col");
    expect(fullTreeWrapper.className).toContain("w-full");
    expect(fullTreeWrapper.className).not.toContain("max-w-4xl");

    fireEvent.click(screen.getByLabelText("Show tree view"));

    const treeContentEl = screen.getByText("Contradiction. This step disproves satisfiability.");
    const treeWrapper = ancestorWithClass(treeContentEl, "flex-1 flex-col");
    expect(treeWrapper.className).toContain("max-w-4xl");
    expect(treeWrapper.className).toContain("mx-auto");

    fireEvent.click(screen.getByLabelText("Show list view"));

    const listContentEl = screen.getByText("Clause 1 and Clause 2 share P with opposite signs.");
    const listWrapper = ancestorWithClass(listContentEl, "flex-1 flex-col");
    expect(listWrapper.className).toContain("max-w-4xl");
    expect(listWrapper.className).toContain("mx-auto");
  });

  it("lets the list view fill the full available height in fullscreen instead of a fixed max-height", () => {
    render(<ResolutionTrace trace={trace} traceIndex={0} onTraceIndexChange={() => {}} />);

    const stepExplanation = "Clause 1 and Clause 2 share P with opposite signs.";
    const nonFullscreenList = ancestorWithClass(screen.getByText(stepExplanation), "space-y-3");
    expect(nonFullscreenList.className).toContain("trace-scroll");

    fireEvent.click(screen.getByLabelText("Expand resolution trace"));

    const fullscreenList = ancestorWithClass(screen.getByText(stepExplanation), "space-y-3");
    expect(fullscreenList.className).toContain("h-full");
    expect(fullscreenList.className).not.toContain("trace-scroll");
  });

  it("lets the full-tree view's scroll region fill the full available height in fullscreen", () => {
    render(<ResolutionTrace trace={trace} traceIndex={0} onTraceIndexChange={() => {}} />);

    fireEvent.click(screen.getByLabelText("Show full tree"));
    const nonFullscreenScroll = ancestorWithClass(screen.getByText("∅ (empty clause)"), "overflow-auto");
    expect(nonFullscreenScroll.className).toContain("trace-scroll");

    fireEvent.click(screen.getByLabelText("Expand resolution trace"));

    const fullscreenScroll = ancestorWithClass(screen.getByText("∅ (empty clause)"), "overflow-auto");
    expect(fullscreenScroll.className).toContain("flex-1");
    expect(fullscreenScroll.className).not.toContain("trace-scroll");
  });

  it("does not change width/height classes when not in fullscreen", () => {
    render(<ResolutionTrace trace={trace} traceIndex={0} onTraceIndexChange={() => {}} />);

    fireEvent.click(screen.getByLabelText("Show tree view"));
    const treeContentEl = screen.getByText("Contradiction. This step disproves satisfiability.");
    const treeContainer = treeContentEl.closest("div.p-6");
    expect(treeContainer?.className).toBe("p-6");
  });
});
