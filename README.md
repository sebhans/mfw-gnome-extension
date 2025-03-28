# Mouse follows window GNOME extension
A GNOME extension that provides window management shortcuts and automatically
moves the mouse cursor to follow window operations. The extension is
particularly useful when used with _focus follows mouse_ and multiple monitors
arranged horizontally.

## Features
- Provides keyboard shortcuts for window management (maximize, unmaximize, tile left/right and up/down)
- Supports horizontal multi-monitor setups with intelligent window movement between monitors
- Ensures the mouse cursor remains inside the focused window when moving it (so focus is not lost with _focus follows mouse_)

## Keyboard Shortcuts
- `Super+Up`: Maximize current window
- `Super+Down`: Unmaximize current window
- `Super+Shift+Left`: Tile window to left half of screen. If already tiled left, move to right half of left monitor
- `Super+Shift+Right`: Tile window to right half of screen. If already tiled right, move to left half of right monitor
- `Super+Shift+Up`: If window is split left/right, splits it to the top quarter
- `Super+Shift+Down`: If window is split left/right, splits it to the bottom quarter

## Compatibility & caveats
Compatible with GNOME shell 42 under Wayland.

Currently, the extension relies on `input-emulator` to be installed in
`/usr/local/bin`.

## Requirements
This extension relies on [input-emulator](https://github.com/tio/input-emulator)
to actually move the mouse pointer under Wayland.

For the keyboard shortcuts to be effective, the standard “window” operation
shortcuts `Super+Up` and `Super+Down`, as well as the standard “navigation”
shortcuts `Super+Shift+Left` and `Super+Shift+Right` must be disabled in the
GNOME settings.
It probably makes sense to disable the “window” shortcuts `Super+Left` and
`Super+Right` and the “navigation” shortcuts `Super+Shift+Up` and
`Super+Shift+Down`, too, for consistency.