const { Clutter, Meta, Shell, St } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Util = imports.misc.util;

const WARP_DISTANCE = 50;


class Extension {
  constructor() {
    this.windowCreatedSignal = null;
    this.windowSignals = new Map();
    this.windowGeometries = new Map();
    this.focusedWindowId = null;
  }


  /**
   * This function is called when your extension is enabled, which could be
   * done in GNOME Extensions, when you log in or when the screen is unlocked.
   *
   * This is when you should setup any UI for your extension, change existing
   * widgets, connect signals or modify GNOME Shell's behavior.
   */
  enable() {
    console.debug(`enabling ${Me.metadata.name}`);
    Util.spawn(['/usr/local/bin/input-emulator', 'start', 'mouse', '--x-max', '5000', '--y-max', '5000']);
    this.windowCreatedSignal = global.display.connect('window-created', this._onWindowCreated.bind(this)),
    this._connectAllWindows();
  }


  /**
   * This function is called when your extension is uninstalled, disabled in
   * GNOME Extensions or when the screen locks.
   *
   * Anything you created, modified or setup in enable() MUST be undone here.
   * Not doing so is the most common reason extensions are rejected in review!
   */
  disable() {
    console.debug(`disabling ${Me.metadata.name}`);
    if (this.windowCreatedSignal) {
      global.display.disconnect(this.windowCreatedSignal);
      this.windowCreatedSignal = null;
    }
    this._disconnectAllWindows();
    this.windowGeometries.clear();
    Util.spawn(['/usr/local/bin/input-emulator', 'stop', 'mouse']);
  }


  _connectAllWindows() {
    global.get_window_actors().forEach(actor => {
      this._connectWindowSignals(actor.meta_window);
    });
  }


  _disconnectAllWindows() {
    this.windowSignals.forEach((signals, window) => {
      signals.forEach(signalId => window.disconnect(signalId));
    });
    this.windowSignals.clear();
  }


  _connectWindowSignals(window) {
    if (this.windowSignals.has(window)) {
      return;
    }

    let signals = [
      window.connect('focus', this._onFocusWindowChanged.bind(this)),
      window.connect('position-changed', this._onWindowChanged.bind(this)),
      window.connect('size-changed', this._onWindowChanged.bind(this)),
    ];

    this.windowSignals.set(window, signals);
  }


  _onWindowCreated(display, window) {
    console.debug(`created [${window.get_title()}]`);
    this._connectWindowSignals(window);
    this.windowGeometries.set(window, window.get_frame_rect());
  }


  _onFocusWindowChanged(window) {
    this.focusedWindowId = window.get_id();
    console.debug(`focused [${window.get_title()}]`);
  }


  _onWindowChanged(window) {
    console.debug(`moved [${window.get_title()}]`);
    let frame = window.get_frame_rect();
    if (!window.get_id() == this.focusedWindowId) {
      this.windowGeometries.set(window, frame);
      return;
    }

    let workArea = window.get_work_area_current_monitor();
    console.debug(`moved focused [${window.get_title()}]: ${frame.width}x${frame.height}+${frame.x}+${frame.y} of ${workArea.width}/${workArea.height}`);

    let oldFrame = this.windowGeometries.get(window);
    if (oldFrame && this._hasWarped(frame, oldFrame)) {
      console.debug(`split [${window.get_title()}]; warping`);
      this._ensureMouseIsIn(window);
    }
    this.windowGeometries.set(window, frame);
  }


  _hasWarped(frame, oldFrame) {
    return Math.abs(frame.x - oldFrame.x) >= WARP_DISTANCE
        || Math.abs(frame.y - oldFrame.y) >= WARP_DISTANCE
        || Math.abs(frame.width - oldFrame.width) >= WARP_DISTANCE
        || Math.abs(frame.height - oldFrame.height) >= WARP_DISTANCE;
  }


  _ensureMouseIsIn(window) {
    const frame = window.get_frame_rect();
    let [mouse_x, mouse_y] = global.get_pointer();
    if (mouse_x >= frame.x && mouse_x < frame.x + frame.width && mouse_y >= frame.y && mouse_y < frame.y + frame.height) return;

    let target_x = frame.x + frame.width / 2;
    let target_y = frame.y + frame.height / 2;
    let dx = target_x - mouse_x;
    let dy = target_y - mouse_y;
    console.debug(`moving mouse from ${mouse_x}/${mouse_y} to ${target_x}/${target_y} -> ${dx}/${dy}`);
    Util.spawn(['/usr/local/bin/input-emulator', 'mouse', 'move', `${dx}`, `${dy}`]);

    let [after_x, after_y] = global.get_pointer();
    console.debug(`ended up at ${after_x}/${after_y}`);
  }
}


/**
 * This function is called once when your extension is loaded, not enabled. This
 * is a good time to setup translations or anything else you only do once.
 *
 * You MUST NOT make any changes to GNOME Shell, connect any signals or add any
 * MainLoop sources here.
 *
 * @param {ExtensionMeta} meta - An extension meta object
 * @returns {object} an object with enable() and disable() methods
 */
function init(meta) {
  return new Extension();
}
