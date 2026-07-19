const INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "[contenteditable='true']",
  "[role='combobox']",
  "[role='dialog']",
  "[role='listbox']",
  "[data-game-keyboard-ignore]",
].join(",")

export function shouldIgnoreGameKeyboardEvent(event: KeyboardEvent): boolean {
  if (
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return true
  }

  return event.target instanceof Element
    ? event.target.closest(INTERACTIVE_SELECTOR) !== null
    : false
}
