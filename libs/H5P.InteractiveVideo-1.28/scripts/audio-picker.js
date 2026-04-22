/**
 * audio-picker.js — gear-row audio-language picker for H5P.InteractiveVideo.
 *
 * Stage 2b.2 of the Phase 2 audio-switching handover. Rather than rebuilding
 * the IV source bundle to add a native menu entry, we attach a library-scoped
 * shim that:
 *
 *   1. Subscribes to H5P.externalDispatcher 'initialized' to catch each IV
 *      instance as it mounts.
 *   2. Listens on `instance.video.on('audioTracks', ...)` — this event is
 *      emitted by H5P.Video-1.7's hls.js integration (Stage 2b.1) when
 *      Hls.Events.MANIFEST_PARSED fires.
 *   3. Clones the captions-button + captions-chooser DOM pattern (the IV
 *      internals follow the same shape for captions / playbackRate / quality
 *      choosers) into an "Audio language" button + chooser.
 *   4. Wires click → `instance.video.setAudioTrack(track)`, which H5P.Video
 *      routes to `hls.audioTrack = track.value`.
 *   5. Subscribes to `instance.video.on('audioTrack', ...)` for the reverse
 *      direction (hls.js emits AUDIO_TRACK_SWITCHED after a switch
 *      completes) to keep aria-checked in sync with the actual track.
 *
 * Scope kept narrow: this ships as a library file so a future source rebuild
 * of H5P.InteractiveVideo-1.28 can absorb the picker into the main bundle
 * and this shim goes away. Until then, it owns the picker UI.
 *
 * Native-HLS path (Safari) does NOT get a picker. Hls is falsy on iOS and
 * hls.js never attaches there, so the 'audioTracks' event never fires and
 * this shim is a no-op. Users rely on Safari's built-in track UI there.
 * This matches handover R3.
 */
(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Styles — injected once on first picker creation. Mirrors captions button
  // styling minimum: size, hover, CSS-only icon.
  // -------------------------------------------------------------------------
  var STYLE_ID = 'h5p-iv-audio-picker-style';
  var stylesInjected = false;
  function injectStyles() {
    if (stylesInjected || document.getElementById(STYLE_ID)) return;
    stylesInjected = true;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    // Use a headphone glyph as the icon via ::before — same sizing as the
    // sibling captions icon. Matches h5p-control sizing.
    style.textContent =
      '.h5p-control.h5p-audio-track{font-family:inherit}' +
      '.h5p-control.h5p-audio-track::before{content:"\\1F3A7";font-size:.9em;line-height:1;display:inline-block;vertical-align:middle}' +
      '.h5p-chooser.h5p-audio-track ol{list-style:none;padding:0;margin:0}' +
      '.h5p-chooser.h5p-audio-track li[role=menuitemradio]{cursor:pointer}';
    document.head.appendChild(style);
  }

  // -------------------------------------------------------------------------
  // Close any other open chooser popups (captions, playbackRate, quality)
  // when the audio chooser opens — matches the single-chooser-at-a-time UX
  // of the existing IV choosers.
  // -------------------------------------------------------------------------
  function closeSiblingChoosers(container) {
    // IV's show/hide mechanism is the `h5p-show` class on `.h5p-chooser`.
    // aria-hidden stays "true" on the markup even when visible — it's a
    // quirk of the library's a11y approach. Matching behaviour here.
    var choosers = container.querySelectorAll('.h5p-chooser.h5p-show');
    for (var i = 0; i < choosers.length; i++) {
      var c = choosers[i];
      if (c.classList.contains('h5p-audio-track')) continue;
      c.classList.remove('h5p-show');
    }
    var buttons = container.querySelectorAll('.h5p-control[aria-haspopup="true"]');
    for (var j = 0; j < buttons.length; j++) {
      var b = buttons[j];
      if (b.classList.contains('h5p-audio-track')) continue;
      b.setAttribute('aria-expanded', 'false');
    }
  }

  // -------------------------------------------------------------------------
  // Render the picker DOM and wire interactions. Idempotent: if the IV
  // instance already has a picker (e.g., audioTracks fires twice), we update
  // the existing one instead of appending a duplicate.
  // -------------------------------------------------------------------------
  function renderPicker(iv, tracks) {
    if (!iv || !iv.controls || !iv.controls.$captionsButton) return;
    if (!tracks || tracks.length < 2) return;

    injectStyles();

    // Locate the captions button — our anchor for DOM insertion
    var captionsButton = iv.controls.$captionsButton[0];
    if (!captionsButton || !captionsButton.parentNode) return;
    var controlsRight = captionsButton.parentNode;

    // Locate the captions chooser dialog in the overall player DOM so we can
    // mount the new chooser in the same container.
    var captionsChooser = controlsRight.querySelector('.h5p-chooser.h5p-captions');
    if (!captionsChooser) {
      // Captions chooser lives in a different wrapper in some IV versions.
      // Fall back to any h5p-chooser we can find and use its parent.
      captionsChooser = document.querySelector('.h5p-chooser');
    }
    if (!captionsChooser || !captionsChooser.parentNode) return;
    var chooserContainer = captionsChooser.parentNode;

    // Already created — just refresh contents.
    var existingButton = controlsRight.querySelector('.h5p-control.h5p-audio-track');
    var existingChooser = chooserContainer.querySelector('.h5p-chooser.h5p-audio-track');
    if (existingButton && existingChooser) {
      refreshTrackList(existingChooser, iv, tracks);
      return;
    }

    // ----- Build the toolbar button -----
    var button = document.createElement('div');
    button.className = 'h5p-control h5p-audio-track';
    button.setAttribute('tabindex', '0');
    button.setAttribute('role', 'button');
    button.setAttribute('title', 'Audio language');
    button.setAttribute('aria-label', 'Audio language');
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-expanded', 'false');

    // Insert RIGHT AFTER the captions button so the row reads
    // ... CC | 🎧 | gear | fullscreen
    if (captionsButton.nextSibling) {
      controlsRight.insertBefore(button, captionsButton.nextSibling);
    } else {
      controlsRight.appendChild(button);
    }

    // ----- Build the chooser popup -----
    var chooser = document.createElement('div');
    chooser.className = 'h5p-chooser h5p-audio-track';
    chooser.setAttribute('role', 'dialog');
    chooser.setAttribute('aria-hidden', 'true');

    var titleBar = document.createElement('div');
    titleBar.className = 'h5p-chooser-title';
    var h2 = document.createElement('h2');
    var menuId = 'h5p-iv-audio-menu-' + Math.random().toString(36).slice(2, 9);
    h2.id = menuId;
    h2.textContent = 'Audio language';
    titleBar.appendChild(h2);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'h5p-chooser-close-button';
    closeBtn.setAttribute('tabindex', '0');
    closeBtn.setAttribute('role', 'button');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', function () {
      setOpen(false);
    });
    titleBar.appendChild(closeBtn);
    chooser.appendChild(titleBar);

    var menu = document.createElement('ol');
    menu.setAttribute('role', 'menu');
    chooser.appendChild(menu);

    // Copy the captions chooser's inline max-height style so the popup
    // doesn't overflow tiny players.
    var cCompStyle = captionsChooser.style && captionsChooser.style.maxHeight;
    if (cCompStyle) chooser.style.maxHeight = cCompStyle;

    chooserContainer.appendChild(chooser);

    // ----- Wire open/close -----
    // IV library uses the `h5p-show` class to reveal choosers; aria-hidden
    // stays true even when visible (library convention).
    function setOpen(isOpen) {
      if (isOpen) chooser.classList.add('h5p-show');
      else chooser.classList.remove('h5p-show');
      button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) closeSiblingChoosers(controlsRight.parentNode);
    }

    button.addEventListener('click', function () {
      var currentlyOpen = chooser.classList.contains('h5p-show');
      setOpen(!currentlyOpen);
    });
    button.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        button.click();
      }
    });

    // ----- Populate the track list -----
    refreshTrackList(chooser, iv, tracks);

    // Close on outside click — matches typical IV chooser UX.
    document.addEventListener('click', function (e) {
      if (!chooser.classList.contains('h5p-show')) return;
      if (button.contains(e.target) || chooser.contains(e.target)) return;
      setOpen(false);
    });

    // Keep aria-checked in sync when the audio track changes from elsewhere
    // (e.g., hls.js's own AUDIO_TRACK_SWITCHED fires when the network
    // finally delivers the new audio; the UI already flipped aria-checked
    // on click, but this handles external switches too).
    iv.video.on('audioTrack', function (e) {
      var current = e && e.data;
      if (!current) return;
      updateCheckedState(chooser, current.value);
    });
  }

  // -------------------------------------------------------------------------
  // Rebuild the <li role="menuitemradio"> entries from a tracks array.
  // Called once on create + on future audioTracks re-emits (e.g. quality
  // changes on some providers).
  // -------------------------------------------------------------------------
  function refreshTrackList(chooser, iv, tracks) {
    var menu = chooser.querySelector('ol[role="menu"]');
    if (!menu) return;
    while (menu.firstChild) menu.removeChild(menu.firstChild);

    var currentTrack = (iv.video.getAudioTrack && iv.video.getAudioTrack()) || null;
    var currentValue = currentTrack ? currentTrack.value : 0;

    var menuId = chooser.querySelector('h2') && chooser.querySelector('h2').id;

    for (var i = 0; i < tracks.length; i++) {
      (function (track) {
        var li = document.createElement('li');
        li.setAttribute('role', 'menuitemradio');
        li.setAttribute('data-track-value', String(track.value));
        if (menuId) li.setAttribute('aria-describedby', menuId);
        var checked = track.value === currentValue;
        li.setAttribute('aria-checked', checked ? 'true' : 'false');
        if (checked) li.setAttribute('tabindex', '0');
        li.textContent = track.label;

        li.addEventListener('click', function () {
          // Optimistic UI update — flip aria-checked immediately, then
          // delegate. hls.js fires AUDIO_TRACK_SWITCHED async after the
          // network-fetch cycle completes; our 'audioTrack' listener will
          // re-confirm.
          updateCheckedState(chooser, track.value);
          iv.video.setAudioTrack(track);
          chooser.classList.remove('h5p-show');
          var btn = chooser.parentNode && chooser.parentNode.querySelector('.h5p-control.h5p-audio-track');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        });
        li.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); }
        });

        menu.appendChild(li);
      })(tracks[i]);
    }
  }

  function updateCheckedState(chooser, selectedValue) {
    var items = chooser.querySelectorAll('li[role="menuitemradio"]');
    for (var i = 0; i < items.length; i++) {
      var v = parseInt(items[i].getAttribute('data-track-value'), 10);
      var checked = v === selectedValue;
      items[i].setAttribute('aria-checked', checked ? 'true' : 'false');
      if (checked) items[i].setAttribute('tabindex', '0');
      else items[i].removeAttribute('tabindex');
    }
  }

  // -------------------------------------------------------------------------
  // Bootstrap — subscribe to H5P's init dispatcher. Guard against missing
  // externalDispatcher (very old H5P integrations don't have it).
  // -------------------------------------------------------------------------
  function attachToInstance(instance) {
    if (!instance || !instance.libraryInfo) return;
    if (instance.libraryInfo.machineName !== 'H5P.InteractiveVideo') return;
    if (!instance.video || typeof instance.video.on !== 'function') return;

    // Poll-friendly: always re-check getAudioTracks() because the poll
    // backstop calls us every 200ms until hls.js's MANIFEST_PARSED has
    // fired. renderPicker itself is idempotent (dedups via DOM lookup).
    if (typeof instance.video.getAudioTracks === 'function') {
      var existing = instance.video.getAudioTracks();
      if (existing && existing.length >= 2) {
        renderPicker(instance, existing);
      }
    }

    // Subscribe once per instance — covers the other race where MANIFEST_PARSED
    // fires AFTER we subscribe. The flag only gates this event-subscription,
    // not the render-on-poll path above.
    if (!instance.__audioPickerSubscribed) {
      instance.__audioPickerSubscribed = true;
      instance.video.on('audioTracks', function (e) {
        var tracks = e && e.data;
        if (!tracks || tracks.length < 2) return;
        renderPicker(instance, tracks);
      });
    }
  }

  function bootstrap() {
    if (typeof window.H5P === 'undefined' || !window.H5P.externalDispatcher) return;

    // 1. Catch future IV instances that fire 'initialized' after we subscribe.
    //    Note: in h5p-standalone the first 'initialized' dispatches we see
    //    often have `event.data` incomplete (no libraryInfo yet), so
    //    attachToInstance guards against that and exits cleanly.
    window.H5P.externalDispatcher.on('initialized', function (event) {
      attachToInstance(event && event.data);
    });

    // 2. Catch IV instances already live on the page at bootstrap time.
    if (Array.isArray(window.H5P.instances)) {
      for (var i = 0; i < window.H5P.instances.length; i++) {
        attachToInstance(window.H5P.instances[i]);
      }
    }

    // 3. Backstop: h5p-standalone's IV instantiation often lands AFTER our
    //    bootstrap call returns (it runs as a side-effect of script load +
    //    DOMContentLoaded races). Poll for up to 5 seconds so the shim
    //    reliably catches late-mounting instances without depending on the
    //    exact event timing.
    var pollTries = 0;
    var poll = setInterval(function () {
      pollTries++;
      if (pollTries > 25) { clearInterval(poll); return; }
      if (!Array.isArray(window.H5P.instances)) return;
      for (var j = 0; j < window.H5P.instances.length; j++) {
        attachToInstance(window.H5P.instances[j]);
      }
    }, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
