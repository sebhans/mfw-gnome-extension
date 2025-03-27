# Mouse follows window GNOME extension
GNOME extension that makes the mouse follow when a window is warped
(e.g., due to split left/split right operations).
I use this together with _focus follows mouse_.

See my [blog post](https://sebastian-hans.de/blog/mouse-follows-window-gnome-extension/) for details.

Since writing this extension, I have extended it to perform warp operations itself.

## Requirements
This extension relies on [input-emulator](https://github.com/tio/input-emulator)
to actually move the mouse pointer under Wayland.

For the warping to be effective, the standard window operation shortcuts `Super+Left`, `Super+Right`,
`Super+Up`, `Super+Down` must be disabled in the GNOME settings.

## Compatibility & caveats
Compatible with GNOME shell 42.

Currently, the extension relies on `input-emulator` to be installed in
`/usr/local/bin`.
