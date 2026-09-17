import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PropositionEditor } from "@features/proposition-input/PropositionEditor";
import { SymbolPalette } from "@features/proposition-input/SymbolPalette";

describe("SymbolPalette", () => {
  it("inserts a binary operator with its padding spaces intact, even though the button shows it trimmed", () => {
    const onInsert = vi.fn();
    render(<SymbolPalette ariaLabel="test palette" onInsert={onInsert} />);

    const button = screen.getByRole("button", { name: "Insert conjunction symbol" });
    expect(button.textContent).toBe("∧");

    fireEvent.click(button);

    expect(onInsert).toHaveBeenCalledWith(" ∧ ");
  });

  it("inserts negation and parentheses with no padding, since they aren't infix operators", () => {
    const onInsert = vi.fn();
    render(<SymbolPalette ariaLabel="test palette" onInsert={onInsert} />);

    fireEvent.click(screen.getByRole("button", { name: "Insert negation symbol" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert opening parenthesis" }));

    expect(onInsert).toHaveBeenNthCalledWith(1, "¬");
    expect(onInsert).toHaveBeenNthCalledWith(2, "(");
  });
});

describe("PropositionEditor", () => {
  function setup(overrides: {
    value?: string;
    error?: string | null;
    summary?: string;
    running?: boolean;
    onChange?: (value: string) => void;
    onRun?: () => void;
  } = {}) {
    const onChange = overrides.onChange ?? vi.fn();
    const onRun = overrides.onRun ?? vi.fn();
    const utils = render(
      <PropositionEditor
        value={overrides.value ?? ""}
        onChange={onChange}
        error={overrides.error ?? null}
        summary={overrides.summary ?? ""}
        onRun={onRun}
        running={overrides.running ?? false}
      />,
    );
    return { ...utils, onChange, onRun };
  }

  it("reports edits to the goal textarea via onChange", () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText("Goal to verify"), { target: { value: "(P & Q)" } });

    expect(onChange).toHaveBeenCalledWith("(P & Q)");
  });

  it("inserts a palette symbol at the caret position, not just appended to the end", () => {
    const onChange = vi.fn();
    setup({ value: "PQ", onChange });

    const textarea = screen.getByLabelText("Goal to verify") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(1, 1); // caret between "P" and "Q"

    fireEvent.click(screen.getByRole("button", { name: "Insert negation symbol" }));

    expect(onChange).toHaveBeenCalledWith("P¬Q");
  });

  it("replaces a selected range instead of just inserting alongside it", () => {
    const onChange = vi.fn();
    setup({ value: "P & Q", onChange });

    const textarea = screen.getByLabelText("Goal to verify") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(2, 3); // selects the "&"

    fireEvent.click(screen.getByRole("button", { name: "Insert disjunction symbol" }));

    expect(onChange).toHaveBeenCalledWith("P  ∨  Q");
  });

  it("disables the run button and swaps its label while a request is in flight", () => {
    setup({ running: true });

    const button = screen.getByRole("button", { name: "Running…" }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Run Resolution" })).toBeNull();
  });

  it("calls onRun when the run button is clicked", () => {
    const { onRun } = setup({ running: false });

    fireEvent.click(screen.getByRole("button", { name: "Run Resolution" }));

    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("shows the running summary and an error alert when given", () => {
    setup({ summary: "2 knowledge clauses · goal ready", error: "Unexpected end of formula" });

    expect(screen.getByText("2 knowledge clauses · goal ready")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("Unexpected end of formula");
  });

  it("renders no alert when there is no error", () => {
    setup({ error: null });

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
