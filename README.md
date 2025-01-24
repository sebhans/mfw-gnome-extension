# Mouse follows window GNOME extension
GNOME extension that makes the mouse follow when a window is warped
(split left, split right).
I use this together with _focus follows mouse_.

See my [blog post](https://sebastian-hans.de/blog/mouse-follows-window-gnome-extension/) for details.

## Requirements
This extension relies on [input-emulator](https://github.com/tio/input-emulator)
to actually move the mouse pointer under Wayland.

## Compatibility & caveats
Compatible with GNOME shell 42.

Currently, the extension relies on `input-emulator` to be installed in
`/usr/local/bin`.
