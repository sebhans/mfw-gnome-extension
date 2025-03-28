const { Meta, Shell } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main
const Me = ExtensionUtils.getCurrentExtension();
const Util = imports.misc.util;

const WARP_DISTANCE = 100;
const WINDOW_FUZZ_DISTANCE = 20;
const BOTH_DIRECTIONS = 3;

const MAXIMIZE_SHORTCUT = "<Super>Up"
const UNMAXIMIZE_SHORTCUT = "<Super>Down"
const SPLIT_LEFT_SHORTCUT = "<Super>Left"
const SPLIT_RIGHT_SHORTCUT = "<Super>Right"
const SPLIT_UP_SHORTCUT = "<Super><Shift>Up"
const SPLIT_DOWN_SHORTCUT = "<Super><Shift>Down"


class KeyManager {
  constructor() {
    this.grabbers = new Map()
    global.display.connect( 'accelerator-activated', this._onAccelerator.bind(this))
  }

  listenFor(accelerator, callback) {
    console.debug('Trying to listen for keyboard shortcut', accelerator)
    let action = global.display.grab_accelerator(accelerator, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT)

    if (action == Meta.KeyBindingAction.NONE) {
      console.warn('Unable to grab accelerator', accelerator)
    } else {
      let name = Meta.external_binding_name_for_action(action)
      Main.wm.allowKeybinding(name, Shell.ActionMode.ALL)
      this.grabbers.set(action, {
        name: name,
        accelerator: accelerator,
        callback: callback,
        action: action
      })
    }
  }

  unbindAll() {
    for (let it of this.grabbers) {
      global.display.ungrab_accelerator(it.action)
      Main.wm.allowKeybinding(it.name, Shell.ActionMode.NONE)
    }
    this.grabbers = new Map()
  }

  _onAccelerator(_display, action, _deviceId, _timestamp) {
    let grabber = this.grabbers.get(action)

    if (grabber) {
      this.grabbers.get(action).callback()
    }
  }
}


class Extension {
  constructor() {
    this.windowCreatedSignal = null;
    this.windowSignals = new Map();
    this.windowGeometries = new Map();
    this.focusedWindowId = null;
    this._keyManager = null;
  }


  /**
   * This function is called when your extension is enabled, which could be
   * done in GNOME Extensions, when you log in or when the screen is unlocked.
   *
   * This is when you should setup any UI for your extension, change existing
   * widgets, connect signals or modify GNOME Shell's behavior.
   */
  enable() {
    console.warn(`[mfw-extension] enabling ${Me.metadata.name}`);
    Util.spawn(['/usr/local/bin/input-emulator', 'start', 'mouse', '--x-max', '5000', '--y-max', '5000']);
    this._setUpKeyboardShortcuts();
    this._trackAllWindows();
  }


  /**
   * This function is called when your extension is uninstalled, disabled in
   * GNOME Extensions or when the screen locks.
   *
   * Anything you created, modified or setup in enable() MUST be undone here.
   * Not doing so is the most common reason extensions are rejected in review!
   */
  disable() {
    console.warn(`[mfw-extension] disabling ${Me.metadata.name}`);
    this._untrackAllWindows();
    Util.spawn(['/usr/local/bin/input-emulator', 'stop', 'mouse']);
  }


  _setUpKeyboardShortcuts() {
    console.warn('[mfw-extension] setting up keyboard shortcuts')
    this._keyManager = new KeyManager();
    this._keyManager.listenFor(MAXIMIZE_SHORTCUT, this._handleMaximize.bind(this))
    this._keyManager.listenFor(UNMAXIMIZE_SHORTCUT, this._handleUnmaximize.bind(this))
    this._keyManager.listenFor(SPLIT_LEFT_SHORTCUT, this._handleSplitLeft.bind(this))
    this._keyManager.listenFor(SPLIT_RIGHT_SHORTCUT, this._handleSplitRight.bind(this))
    this._keyManager.listenFor(SPLIT_UP_SHORTCUT, this._handleSplitUp.bind(this))
    this._keyManager.listenFor(SPLIT_DOWN_SHORTCUT, this._handleSplitDown.bind(this))
    console.warn('[mfw-extension] done setting up keyboard shortcuts')
  }


  _removeKeyboardShortcuts() {
    if (this._keyManager) {
      this._keyManager.unbindAll()
      this._keyManager = null
    }
  }


  _handleMaximize() {
    const window = global.display.focus_window;
    if (!window) return;
    console.warn(`[mfw-extension] maximizing ${window.get_title()}`)
    window.maximize(BOTH_DIRECTIONS);
    window.raise()
  };

  _unmaximize(window) {
    if (window.maximized_horizontally || window.maximized_vertically) {
      window.unmaximize(BOTH_DIRECTIONS);
      window.raise()
    }
  }

  _handleUnmaximize() {
    const window = global.display.focus_window;
    if (!window) return;
    console.warn(`[mfw-extension] unmaximizing ${window.get_title()}`)
    this._unmaximize(window);
  }

  _handleSplitLeft() {
    const window = global.display.focus_window;
    if (!window) return;
    console.warn(`[mfw-extension] splitting left ${window.get_title()}`)
    const workArea = window.get_work_area_current_monitor();

    if (!this._isTiledLeft(workArea, window.get_frame_rect())) {
      this._unmaximize(window);
      this._warp(window, workArea.x, workArea.y, Math.floor(workArea.width / 2), workArea.height);
      return;
    }

    const monitor = window.get_monitor();
    const targetMonitor = global.display.get_monitor_neighbor_index(monitor, Meta.DisplayDirection.LEFT);
    if (targetMonitor == -1) {
      console.warn(`[mfw-extension] is tiled left on monitor ${monitor} and there is no monitor further left`)
      return;
    }

    console.warn(`[mfw-extension] is tiled left on monitor ${monitor}; moving to monitor ${targetMonitor}`)
    this._unmaximize(window);
    window.move_to_monitor(targetMonitor);
    const targetWorkArea = window.get_work_area_for_monitor(targetMonitor);
    this._warp(window, targetWorkArea.x + Math.floor(targetWorkArea.width / 2), targetWorkArea.y, Math.floor(targetWorkArea.width / 2), targetWorkArea.height);
  };


  _handleSplitRight() {
    const window = global.display.focus_window;
    if (!window) return;
    console.warn(`[mfw-extension] splitting right ${window.get_title()}`)
    const workArea = window.get_work_area_current_monitor();
    this._unmaximize(window);
    this._warp(window, workArea.x + Math.floor(workArea.width / 2), workArea.y, Math.floor(workArea.width / 2), workArea.height);
  };


  _handleSplitUp() {
    const window = global.display.focus_window;
    if (!window) return;
    console.warn(`[mfw-extension] splitting up ${window.get_title()}`)
    const workArea = window.get_work_area_current_monitor();
    const frame = window.get_frame_rect()
    if (this._isTiledLeftOrRight(workArea, frame)) {
      console.warn('[mfw-extension] is tiled')
      this._warp(window, frame.x, workArea.y, frame.width, Math.floor(workArea.height / 2));
    } else {
      console.warn('[mfw-extension] is NOT tiled')
    }
  }


  _handleSplitDown() {
    const window = global.display.focus_window;
    if (!window) return;
    console.warn(`[mfw-extension] splitting down ${window.get_title()}`)
    const workArea = window.get_work_area_current_monitor();
    const frame = window.get_frame_rect()
    if (this._isTiledLeftOrRight(workArea, frame)) {
      console.warn('[mfw-extension] is tiled')
      this._warp(window, frame.x, workArea.y + Math.floor(workArea.height /  2), frame.width, Math.floor(workArea.height / 2));
    } else {
      console.warn('[mfw-extension] is NOT tiled')
    }
  }


  _warp(window, nwx, nwy, width, height) {
    window.move_resize_frame(true, nwx, nwy, width, height);
    window.raise()
  }


  _isTiledLeft(workArea, frame) {
    return frame.x == workArea.x && frame.width == Math.floor(workArea.width / 2);
  }


  _isTiledRight(workArea, frame) {
    return frame.x == workArea.x + Math.floor(workArea.width / 2) && frame.width == Math.floor(workArea.width / 2);
  }


  _isTiledLeftOrRight(workArea, frame) {
    return this._isTiledLeft(workArea, frame) || this._isTiledRight(workArea, frame);
  }


  _trackAllWindows() {
    console.warn('[mfw-extension] tracking all windows')
    this.windowCreatedSignal = global.display.connect('window-created', this._onWindowCreated.bind(this));
    this.focusedWindowId = global.display.focus_window?.get_id();
    global.get_window_actors().forEach(actor => {
      this._trackWindow(actor.meta_window);
    });
    console.warn('[mfw-extension] done tracking all windows')
  }


  _untrackAllWindows() {
    if (this.windowCreatedSignal) {
      global.display.disconnect(this.windowCreatedSignal);
      this.windowCreatedSignal = null;
    }

    this.windowSignals.forEach((signals, window) => {
      signals.forEach(signalId => window.disconnect(signalId));
    });
    this.windowSignals.clear();
    this.windowGeometries.clear();
    this.focusedWindowId = null;
  }


  _trackWindow(window) {
    if (this.windowSignals.has(window)) {
      return;
    }

    switch (window.get_window_type()) {
      case Meta.WindowType.MENU:
      case Meta.WindowType.DROPDOWN_MENU:
      case Meta.WindowType.POPUP_MENU:
      case Meta.WindowType.TOOLTIP:
      case Meta.WindowType.NOTIFICATION:
      case Meta.WindowType.COMBO:
        return;
    }
    console.warn(`[mfw-extension] tracking window ${window.get_title()}`)


    const signals = [
      window.connect('focus', this._onFocusWindowChanged.bind(this)),
      window.connect('position-changed', this._onWindowChanged.bind(this)),
      window.connect('size-changed', this._onWindowChanged.bind(this)),
    ];

    this.windowSignals.set(window, signals);
    this.windowGeometries.set(window, window.get_frame_rect());
  }


  _onWindowCreated(_display, window) {
    console.debug(`[mfw-extension] created [${window.get_title()}] [${window.get_wm_class()}] type:${window.get_window_type()}`);
    this._trackWindow(window);
  }


  _onFocusWindowChanged(window) {
    this.focusedWindowId = window.get_id();
    console.debug(`[mfw-extension] focused [${window.get_title()}]`);
      this._ensureMouseIsIn(window);
    }


  _onWindowChanged(window) {
    console.debug(`[mfw-extension] moved [${window.get_title()}]`);
    const frame = window.get_frame_rect();
    if (window.get_id() != this.focusedWindowId) {
      this.windowGeometries.set(window, frame);
      return;
    }

    const workArea = window.get_work_area_current_monitor();
    console.debug(`[mfw-extension] moved focused [${window.get_title()}]: ${frame.width}x${frame.height}+${frame.x}+${frame.y} of ${workArea.width}/${workArea.height}`);

    const oldFrame = this.windowGeometries.get(window);
    if (oldFrame && this._hasWarped(frame, oldFrame)) {
      console.debug(`[mfw-extension] split [${window.get_title()}]; warping`);
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
    const [mouse_x, mouse_y] = global.get_pointer();
    if (mouse_x >= frame.x - WINDOW_FUZZ_DISTANCE
        && mouse_x < frame.x + frame.width + WINDOW_FUZZ_DISTANCE
        && mouse_y >= frame.y - WINDOW_FUZZ_DISTANCE
        && mouse_y < frame.y + frame.height + WINDOW_FUZZ_DISTANCE) return;

    // make sure the window is in the foreground lest it lose focus immediately
    window.activate(global.get_current_time());

    const target_x = frame.x + frame.width / 2;
    const target_y = frame.y + frame.height / 2;
    const dx = target_x - mouse_x;
    const dy = target_y - mouse_y;
    console.debug(`[mfw-extension] moving mouse from ${mouse_x}/${mouse_y} to ${target_x}/${target_y} -> ${dx}/${dy}`);
    Util.spawn(['/usr/local/bin/input-emulator', 'mouse', 'move', `${dx}`, `${dy}`]);

    const [after_x, after_y] = global.get_pointer();
    console.debug(`[mfw-extension] ended up at ${after_x}/${after_y}`);
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
function init(_meta) {
  return new Extension();
}
