import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LineByLineEditor } from "@features/knowledge-base/LineByLineEditor";

function TestHarness({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  return <LineByLineEditor value={value} onChange={setValue} />;
}

/** Stubs global fetch so parseFormulas() resolves with the given
 * `results` payloads in order (the last one repeats for any further
 * call) - mirrors the fetch-stubbing style already used in
 * api-client.test.tsx, just parameterized over multiple calls. */
function stubParseResponses(...resultsList: unknown[][]) {
  let call = 0;
  const fetchMock = vi.fn().mockImplementation(() => {
    const results = resultsList[Math.min(call, resultsList.length - 1)];
    call += 1;
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ results }),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function placeCursorAtEnd(input: HTMLInputElement) {
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LineByLineEditor per-line validation highlight", () => {
  it("clears a stale valid highlight once the line's text is edited", async () => {
    stubParseResponses([{ formula: "(P & Q)", success: true, tree: null, error: null }]);

    render(<TestHarness initialValue="(P & Q)" />);
    const input = screen.getByDisplayValue("(P & Q)") as HTMLInputElement;

    placeCursorAtEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(input.className).toContain("bg-success-soft"));

    // Editing the line - without pressing Enter again - must not leave
    // the old "valid" color showing for text that was never checked.
    fireEvent.change(input, { target: { value: "" } });

    expect(input.className).not.toContain("bg-success-soft");
    expect(input.className).toContain("bg-transparent");
  });

  it("revalidates a changed line on blur, without needing Enter", async () => {
    stubParseResponses(
      [{ formula: "(P & Q)", success: true, tree: null, error: null }],
      [
        {
          formula: "(P @ Q)",
          success: false,
          tree: null,
          error: { code: "ILLEGAL_CHARACTER", position: 3, message: "Illegal character" },
        },
      ],
    );

    render(<TestHarness initialValue="(P & Q)" />);
    const input = screen.getByDisplayValue("(P & Q)") as HTMLInputElement;

    placeCursorAtEnd(input);
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(input.className).toContain("bg-success-soft"));

    fireEvent.change(input, { target: { value: "(P @ Q)" } });
    fireEvent.blur(input);

    await waitFor(() => expect(input.className).toContain("bg-danger-soft"));
    expect(screen.getByText("Illegal character")).toBeTruthy();
  });

  it("does not reuse a validated line's highlight once its own text is cleared", async () => {
    stubParseResponses([{ formula: "(P & Q)", success: true, tree: null, error: null }]);

    render(<TestHarness initialValue={"(P & Q)\nR"} />);
    const firstLine = screen.getByDisplayValue("(P & Q)") as HTMLInputElement;

    placeCursorAtEnd(firstLine);
    fireEvent.keyDown(firstLine, { key: "Enter" });
    await waitFor(() => expect(firstLine.className).toContain("bg-success-soft"));

    // Move the cursor to the very start and split there instead - the
    // first line's stored ("(P & Q)", valid) status must not leak onto
    // whatever text now occupies index 0 (here, an empty string).
    firstLine.setSelectionRange(0, 0);
    fireEvent.keyDown(firstLine, { key: "Enter" });

    const lines = screen.getAllByRole("textbox") as HTMLInputElement[];
    expect(lines[0].value).toBe("");
    expect(lines[0].className).not.toContain("bg-success-soft");
    expect(lines[0].className).toContain("bg-transparent");
  });
});
