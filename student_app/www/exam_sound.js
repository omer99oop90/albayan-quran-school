/**
 * Sound effects engine (Disabled per user request).
 * Stubs are kept to prevent any undefined function errors.
 */
class SoundManager {
  constructor() {
    this.isMuted = true;
  }
  initContext() {}
  toggleMute() { return true; }
  updateToggleUI() {}
  playSelect() {}
  playConnect() {}
  playMatchingComplete() {}
  playSuccess() {}
  playEncourage() {}
}

window.soundManager = new SoundManager();
window.toggleAudioMute = function() {};
