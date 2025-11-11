class SoundManager {
  constructor() {
    this.sounds = {};
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Preload UI sound
      this.sounds.ui = new Audio('sounds/UI.wav');
      this.sounds.ui.preload = 'auto';
      this.sounds.ui.volume = 0.5; // Volume (0.0 - 1.0)
      
      // Add more sounds here
      // this.sounds.otherSound = new Audio('sounds/other.wav');
      
      this.initialized = true;
      console.log('SoundManager: Sounds loaded successfully');
    } catch (error) {
      console.error('SoundManager: Error loading sounds', error);
    }
  }

  playUI() {
    if (!this.sounds.ui) return;
    
    try {
      // Clone the audio element to allow overlapping plays
      const sound = this.sounds.ui.cloneNode();
      sound.volume = this.sounds.ui.volume;
      sound.play().catch(err => {
        console.log('SoundManager: Error playing UI sound', err);
      });
    } catch (error) {
      console.error('SoundManager: Error en playUI', error);
    }
  }

  // Change UI volume in real-time
  setUIVolume(volume) {
    if (this.sounds.ui) {
      this.sounds.ui.volume = Math.max(0, Math.min(1, volume));
    }
  }
}

// Global instance
const soundManager = new SoundManager();