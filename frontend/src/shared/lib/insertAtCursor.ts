/** Inserts `text` at the current caret position (replacing any selection) and restores focus/caret. */
export function insertAtCursor(
  textarea: HTMLTextAreaElement | null,
  value: string,
  text: string,
  setValue: (next: string) => void,
) {
  if (!textarea) {
    setValue(value + text);
    return;
  }
  const start = textarea.selectionStart ?? value.length;
  const end = textarea.selectionEnd ?? value.length;
  const next = value.slice(0, start) + text + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    textarea.focus();
    const caret = start + text.length;
    textarea.setSelectionRange(caret, caret);
  });
}
