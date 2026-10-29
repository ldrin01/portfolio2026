// The desk keyboard in the Keyboard frame: a 96% layout traced from the photo, row by row, back to front.
// Each key is [KeyboardEvent.code, width in units, depth in units]; keys fill each row left to right.
// An empty code is a key a browser never reports (fn, the backlight key).
type Key = [code: string, w?: number, d?: number]

export const keyboardRows: Key[][] = [
  [['Escape'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => [`F${n}`] as Key), ['Delete'], ['Home'], ['End'], ['PageUp'], ['PageDown'], ['']],
  [['Backquote'], ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => [`Digit${n}`] as Key), ['Minus'], ['Equal'], ['Backspace', 2], ['NumLock'], ['NumpadDivide'], ['NumpadMultiply'], ['NumpadSubtract']],
  [['Tab', 1.5], ...'QWERTYUIOP'.split('').map(c => [`Key${c}`] as Key), ['BracketLeft'], ['BracketRight'], ['Backslash', 1.5], ['Numpad7'], ['Numpad8'], ['Numpad9'], ['NumpadAdd', 1, 2]],
  [['CapsLock', 1.75], ...'ASDFGHJKL'.split('').map(c => [`Key${c}`] as Key), ['Semicolon'], ['Quote'], ['Enter', 2.25], ['Numpad4'], ['Numpad5'], ['Numpad6']],
  [['ShiftLeft', 2.25], ...'ZXCVBNM'.split('').map(c => [`Key${c}`] as Key), ['Comma'], ['Period'], ['Slash'], ['ShiftRight', 1.75], ['ArrowUp'], ['Numpad1'], ['Numpad2'], ['Numpad3'], ['NumpadEnter', 1, 2]],
  [['ControlLeft', 1.25], ['AltLeft', 1.25], ['MetaLeft', 1.25], ['Space', 6.25], ['MetaRight'], [''], ['ControlRight'], ['ArrowLeft'], ['ArrowDown'], ['ArrowRight'], ['Numpad0'], ['NumpadDecimal']]
]

export const keyboardCopy = {
  typed: 'From wireframe to working product.', // typed out behind the keyboard as the page scrolls
  hintKeys: 'Type something',
  hintTouch: 'Tap the keys',
  tilt: 'Tap to tilt'
}
