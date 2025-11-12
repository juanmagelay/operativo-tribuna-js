class SoundManager {
  constructor() {
    this.sounds = {};
    this.initialized = false;
    this.lastDamageTime = 0;
    this.damageThrottleMs = 500;

    // References for background music, keep unique instances
    this.musicMuchachos = null;
    this.musicCrowd = null;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Preload UI sound
      this.sounds.ui = new Audio('sounds/UI.wav');
      this.sounds.ui.preload = 'auto';
      this.sounds.ui.volume = 0.5; // Volume (0.0 - 1.0)
      
      // Preload Dead sound
      this.sounds.dead = new Audio('sounds/Death.wav');
      this.sounds.dead.preload = 'auto';
      this.sounds.dead.volume = 0.9; // Volume (0.0 - 1.0)
      
      // Preload Error sound
      this.sounds.error = new Audio('sounds/Error.wav');
      this.sounds.error.preload = 'auto';
      this.sounds.error.volume = 0.5; // Volume (0.0 - 1.0)
      
      // Preload PutItem sound
      this.sounds.putItem = new Audio('sounds/PutItem.wav');
      this.sounds.putItem.preload = 'auto';
      this.sounds.putItem.volume = 0.5; // Volume (0.0 - 1.0)
      
      // Preload Jump sound
      this.sounds.jump = new Audio('sounds/Jump.wav');
      this.sounds.jump.preload = 'auto';
      this.sounds.jump.volume = 0.5;
      
      // Preload Damage sound
      this.sounds.damage = new Audio('sounds/Damage.wav');
      this.sounds.damage.preload = 'auto';
      this.sounds.damage.volume = 0.3;
      this.initialized = true;

      // Preload background music
      this.musicMuchachos = new Audio('sounds/Muchachos.wav');
      this.musicMuchachos.preload = 'auto';
      this.musicMuchachos.volume = 0.1;
      this.musicMuchachos.loop = true; // Loop
      
      // Preload crowd murmur sound
      this.musicCrowd = new Audio('sounds/Crowd.mp3');
      this.musicCrowd.preload = 'auto';
      this.musicCrowd.volume = 0.1;
      this.musicCrowd.loop = true; // Loop

      this.initialized = true;

      console.log('SoundManager: Sounds loaded successfully');
    } catch (error) {
      console.error('SoundManager: Error loading sounds', error);
    }
  }

  playUI() { this._playSound('ui'); }
  playDead() { this._playSound('dead'); }
  playError() { this._playSound('error'); }
  playPutItem() { this._playSound('putItem'); }
  playJump() { this._playSound('jump'); }

  playDamage() {
    const now = Date.now();
    
    // If less than 500ms have passed since the last sound, do not play
    if (now - this.lastDamageTime < this.damageThrottleMs) {
      return;
    }
    // Update to the latest time and play sound
    this.lastDamageTime = now;
    this._playSound('damage');
  }

    // Background music controls
    
    // Start music "Muchachos" (menu + onboarding)
    startMuchachos() {
        if (!this.musicMuchachos) return;
        
        try {
        // If it is being played, don't do anything
        if (!this.musicMuchachos.paused) return;
        
        this.musicMuchachos.currentTime = 0; // Start from beginning
        this.musicMuchachos.play().catch(err => {
            console.log('SoundManager: Error playing Muchachos', err);
        });
        } catch (error) {
        console.error('SoundManager: Error in startMuchachos', error);
        }
    }

    // Stop music "Muchachos"
    stopMuchachos() {
        if (!this.musicMuchachos) return;
        
        try {
        this.musicMuchachos.pause();
        this.musicMuchachos.currentTime = 0;
        } catch (error) {
        console.error('SoundManager: Error in stopMuchachos', error);
        }
    }

    // Start sound "Crowd" (during gameplay)
    startCrowd() {
        if (!this.musicCrowd) return;
        
        try {
        // If it is being played, don't do anything
        if (!this.musicCrowd.paused) return;
        
        this.musicCrowd.currentTime = 0;
        this.musicCrowd.play().catch(err => {
            console.log('SoundManager: Error playing Crowd', err);
        });
        } catch (error) {
        console.error('SoundManager: Error in startCrowd', error);
        }
    }

    // Stop sound "Crowd"
    stopCrowd() {
        if (!this.musicCrowd) return;
        
        try {
        this.musicCrowd.pause();
        this.musicCrowd.currentTime = 0;
        } catch (error) {
        console.error('SoundManager: Error in stopCrowd', error);
        }
    }

    // Stop all music
    stopAllMusic() {
        this.stopMuchachos();
        this.stopCrowd();
    }


  // Helper method for sound effects
  _playSound(soundKey) {
    if (!this.sounds[soundKey]) return;
    
    try {
      const sound = this.sounds[soundKey].cloneNode();
      sound.volume = this.sounds[soundKey].volume;
      sound.play().catch(err => {
        console.log(`SoundManager: Error playing ${soundKey} sound`, err);
      });
    } catch (error) {
      console.error(`SoundManager: Error in play ${soundKey}`, error);
    }
  }

  // Change volumes in real-time
  setVolume(soundKey, volume) {
    if (this.sounds[soundKey]) {
      this.sounds[soundKey].volume = Math.max(0, Math.min(1, volume));
    }
  }

  setMuchachosVolume(volume) {
    if (this.musicMuchachos) {
      this.musicMuchachos.volume = Math.max(0, Math.min(1, volume));
    }
  }

  setCrowdVolume(volume) {
    if (this.musicCrowd) {
      this.musicCrowd.volume = Math.max(0, Math.min(1, volume));
    }
  }
  
  // Method for dynamically adjusting damage throttle
  setDamageThrottle(milliseconds) {
    this.damageThrottleMs = Math.max(0, milliseconds);
  }
}

// Global instance
const soundManager = new SoundManager();