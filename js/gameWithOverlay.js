// js/gameWithOverlay.js - Game class with overlay functionality

class GameWithOverlay extends Game {
  constructor() {
    super();
    
    // Init Sound Manager
    soundManager.init();

    this.overlay = new GameMenuOverlay(this);
    this._gameActive = false;
    this._onboardingActive = false;
  }

  startGame() {
    this._onboardingActive = true;
    this._gameActive = false;
    this._enableHeroInput(false);
    this._enableEnemies(false);
    this.health = this.maxHealth;
    this.toiletCount = 10;
    this._updateHealthBar();
    this._updateToiletCounter();
  }

  restartGame() {
    // Remove all toilets
    for (const t of this.toilets) {
      if (t.sprite && t.sprite.destroy) t.sprite.destroy();
    }
    this.toilets = [];
    this.health = this.maxHealth;
    this.toiletCount = 10;
    this.remainingSeconds = 60;
    this._timerAccumulatorMs = 0;
    this._updateHealthBar();
    this._updateToiletCounter();
    
    // Reset all characters using Game method
    this.resetAllCharacters();

    // Stop menu/onboarding music and restart gameplay music
    soundManager.stopAllMusic();
    soundManager.startCrowd();
    
    // Start game immediately
    this._onboardingActive = false;
    this._gameActive = true;
    this._enableHeroInput(true);
    this._enableEnemies(true);
  }

  _enableHeroInput(enable) {
    const hero = this._getHero();
    if (hero) hero.inputEnabled = enable;
  }

  _enableEnemies(enable) {
    for (const c of this.characters) {
      if (c instanceof Enemy) c.active = enable;
    }
  }

  gameLoop(time) {
    if (!this._gameActive) return;
    super.gameLoop(time);
    if (this.health <= 0) {
      this._gameActive = false;
      this._enableHeroInput(false);
      this._enableEnemies(false);
      this.overlay.showGameOver();
    } else if (this.remainingSeconds <= 0) {
      this._gameActive = false;
      this._enableHeroInput(false);
      this._enableEnemies(false);
      this.overlay.showWin();
    }
  }

  _finishOnboarding() {
    this._onboardingActive = false;
    this._gameActive = true;
    this._enableHeroInput(true);
    this._enableEnemies(true);
  }
}
