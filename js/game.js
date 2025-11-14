// js/game.js — canonical game entry (moved from root)
// Note: physics helpers live in js/physics.js to avoid duplication.

class Game {
  pixiApp;
  characters = [];
  width;
  height;
  hudContainer;
  timerText;
  remainingSeconds = 60;
  _timerAccumulatorMs = 0;
  uiLayer;
  health = Infinity;
  maxHealth = Infinity;
  healthBarFill;
  toiletCount = 10;
  toiletIconSprite;
  toiletCountText;
  toilets = [];
  camera;
  worldContainer;

  constructor() {
    this.playArea = { x: 0, y: 0, width: 1336, height: 1024 };
    this.grassArea = { x: 1336, y: 0, width: 200, height: 1024 };
    this.worldWidth = 1536;
    this.worldHeight = 1024;
    this.width = 1024;
    this.height = 768;
    this.mouse = { position: { x: 0, y: 0 } };
    this.initPIXI();
  }

  async initPIXI() {
    this.pixiApp = new PIXI.Application();
    const pixiOptions = {
      background: COLORS.generalBackground, 
      width: this.width,
      height: this.height,
      antialias: false,
      SCALE_MODE: PIXI.SCALE_MODES.NEAREST
    };
   
    await this.pixiApp.init(pixiOptions);
    
    const centerDiv = document.getElementById('game-canvas-center');
    if (centerDiv) centerDiv.appendChild(this.pixiApp.canvas);
    
    this.worldContainer = new PIXI.Container();
    this.worldContainer.name = "worldContainer";
    this.pixiApp.stage.addChild(this.worldContainer);
    this.camera = new Camera(this.width, this.height, this.worldWidth, this.worldHeight);
    
    const bgTexture = await PIXI.Assets.load("images/stadium-desktop.png");
    const background = new PIXI.Sprite(bgTexture);
    
    background.x = 0; background.y = 0; background.width = this.worldWidth; background.height = this.worldHeight;
    
    this.worldContainer.addChild(background);
    this.uiLayer = new PIXI.Container();
    this.uiLayer.name = "uiLayer";
    
    const enemySheet = await PIXI.Assets.load("spritesheets/UDeChile.json");
    const heroSheet  = await PIXI.Assets.load("spritesheets/independiente.json");
    
    // Keep all animations provided by the spritesheet (so optional keys like "death" are preserved)
    const makeSpritesheetData = (sheet) => ({ animations: sheet.animations || {} });
    const enemySheetData = makeSpritesheetData(enemySheet);
    const heroSheetData = makeSpritesheetData(heroSheet);
    const hx = this.playArea.x + this.playArea.width;
    const hy = this.playArea.y + this.playArea.height * 0.5;
    
    const hero = new Hero(heroSheetData, hx, hy, this);
    this.characters.push(hero);
    
    const minEnemyDistance = 200;
    
    for (let i = 0; i < 250; i++) {
      let x, y, dist;
      do {
        x = this.playArea.x + Math.random() * this.playArea.width;
        y = this.playArea.y + Math.random() * this.playArea.height;
        dist = Math.sqrt((x - hx) ** 2 + (y - hy) ** 2);
      } while (dist < minEnemyDistance);
      const enemy = new Enemy(enemySheetData, x, y, this);
      enemy.target = hero;
      this.characters.push(enemy);
    }
    await this._createHud();
    this.pixiApp.stage.addChild(this.uiLayer);
    this.pixiApp.ticker.add(this.gameLoop.bind(this));
  }

  addMouseInteractivity() { this.pixiApp.canvas.onmousemove = (event) => { this.mouse.position = { x: event.x, y: event.y }; }; }

  gameLoop(time) {
    const hero = this._getHero();
    if (hero && this.camera) {
      this.camera.follow(hero.position.x, hero.position.y);
      this.camera.update();
      const offset = this.camera.getOffset();
      this.worldContainer.x = -offset.x; this.worldContainer.y = -offset.y;
    }
    const deltaSeconds = (this.pixiApp.ticker.deltaMS || (1000/60)) / 1000;
    const activeToilets = this.toilets.filter(t => !t.destroyed);
    for (let aCharacter of this.characters) {
      if (aCharacter instanceof Enemy) {
        let chosenTarget = this.characters.find(c => c instanceof Hero) || null;
        let nearestToilet = null; let nearestDist = Infinity;
        for (let t of activeToilets) {
          const d = calculateDistance(aCharacter.position, t.position);
          if (d < 220 && d < nearestDist) { nearestDist = d; nearestToilet = t; }
        }
        aCharacter.target = nearestToilet ? nearestToilet : chosenTarget;
      }
    }
    for (let aCharacter of this.characters) {
      aCharacter.tick(); aCharacter.render();
  // position logging removed to reduce console noise
      if (aCharacter instanceof Enemy) {
        const enemy = aCharacter; const target = enemy.target;
        if (target) {
          const targetPos = target.position ? target.position : target;
          const d = calculateDistance(enemy.position, targetPos);
          if (d <= 18) {
            if (target === this._getHero()) this._applyHeroDamage(6 * deltaSeconds);
            else if (target && target.isToilet) this._damageToilet(target, 20 * deltaSeconds);
          }
        }
      }
    }
    this._updateHudTimer(this.pixiApp.ticker.deltaMS || (1000/60));
  }

  async _createHud() {
    
    this.pixiApp.stage.addChild(this.uiLayer);

    // Timer Panel - using LAYOUT constants
    
    const timerLayout = LAYOUT.timerPanel;
    this.hudContainer = new PIXI.Container();
    this.hudContainer.x = Math.round((this.width - timerLayout.width) / 2);
    this.hudContainer.y = timerLayout.marginTop;
    
    const panel = new PIXI.Graphics(); 
    panel.roundRect(0, 0, timerLayout.width, timerLayout.height, timerLayout.borderRadius);
    panel.fill({ color: timerLayout.backgroundColor });
    panel.stroke({ color: timerLayout.borderColor, width: timerLayout.borderWidth });
    
    this.hudContainer.addChild(panel);
    
    // Timer Text - using TEXT_STYLES
    this.timerText = new PIXI.Text("1:00", TEXT_STYLES.hudTimer);
    this.timerText.anchor.set(0.5, 0.5);
    this.timerText.x = Math.round(timerLayout.width / 2);
    this.timerText.y = Math.round(timerLayout.height / 2);
    this.timerText.scale.set(TEXT_SCALES.hudTimer);
    this.hudContainer.addChild(this.timerText);
    
    this._createHealthBar(); 
    await this._createToiletCounter(); 
    this.uiLayer.addChild(this.hudContainer);
  }

  _updateHudTimer(deltaMs) { 
    if (this.remainingSeconds <= 0) return; 
    this._timerAccumulatorMs += deltaMs; 
    while (this._timerAccumulatorMs >= 1000 && this.remainingSeconds > 0) { 
      this._timerAccumulatorMs -= 1000; 
      this.remainingSeconds -= 1; 
      this._renderTimerText(); 
    } 
  }

  _renderTimerText() { 
    const minutes = Math.floor(this.remainingSeconds / 60); 
    const seconds = this.remainingSeconds % 60; 
    const text = `${minutes}:${seconds.toString().padStart(2, "0")}`; 
    if (this.timerText) this.timerText.text = text; 
  }

  _createHealthBar() {
    // Using LAYOUT constants
    const healthLayout = LAYOUT.healthBar;
    
    const container = new PIXI.Container();
    container.x = healthLayout.margin;
    container.y = healthLayout.margin;
    
    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, healthLayout.width, healthLayout.height, healthLayout.borderRadius);
    bg.fill({ color: healthLayout.backgroundColor });
    bg.stroke({ color: healthLayout.borderColor, width: healthLayout.borderWidth });
    container.addChild(bg);
    
    this.healthBarFill = new PIXI.Graphics();
    this.healthBarFill.roundRect(
      healthLayout.fillPadding, 
      healthLayout.fillPadding, 
      healthLayout.width - (healthLayout.fillPadding * 2), 
      healthLayout.height - (healthLayout.fillPadding * 2), 
      healthLayout.borderRadius - 1
    );
    this.healthBarFill.fill({ color: healthLayout.fillColor });
    container.addChild(this.healthBarFill);
    
    this.uiLayer.addChild(container);
    this._updateHealthBar();
  }

  _updateHealthBar() {
    if (!this.healthBarFill) return;
    
    const healthLayout = LAYOUT.healthBar;
    const width = healthLayout.width - (healthLayout.fillPadding * 2);
    const height = healthLayout.height - (healthLayout.fillPadding * 2);
    const ratio = Math.max(0, Math.min(1, this.health / this.maxHealth));
    
    this.healthBarFill.clear();
    this.healthBarFill.roundRect(
      healthLayout.fillPadding, 
      healthLayout.fillPadding, 
      Math.max(1, Math.round(width * ratio)), 
      height, 
      healthLayout.borderRadius - 1
    );
    this.healthBarFill.fill({ color: healthLayout.fillColor });
  }

  async _createToiletCounter() {
    // Using LAYOUT constants
    const toiletLayout = LAYOUT.toiletPanel;
    
    const container = new PIXI.Container();
    container.x = this.width - toiletLayout.width - toiletLayout.marginRight;
    container.y = toiletLayout.marginTop;
    
    const panel = new PIXI.Graphics();
    panel.roundRect(0, 0, toiletLayout.width, toiletLayout.height, toiletLayout.borderRadius);
    panel.fill({ color: toiletLayout.backgroundColor });
    panel.stroke({ color: toiletLayout.borderColor, width: toiletLayout.borderWidth });
    container.addChild(panel);
    
    const row = new PIXI.Container();
    row.y = toiletLayout.height / 2;
    container.addChild(row);
    
    try {
      const tex = await PIXI.Assets.load("images/toilet.png");
      this.toiletIconSprite = new PIXI.Sprite(tex);
      this.toiletIconSprite.scale.set(toiletLayout.iconScale);
      this.toiletIconSprite.anchor.set(0, 0.5);
      row.addChild(this.toiletIconSprite);
    } catch (e) {
      const placeholder = new PIXI.Graphics();
      placeholder.roundRect(0, 0, 32, 32, 4);
      placeholder.fill({ color: 0x444444 });
      placeholder.pivot.y = 16;
      row.addChild(placeholder);
    }
    
    // Using TEXT_STYLES
    this.toiletCountText = new PIXI.Text(`x ${this.toiletCount}`, TEXT_STYLES.toiletCounter);
    this.toiletCountText.scale.set(TEXT_SCALES.toiletCounter);
    this.toiletCountText.anchor.set(0, 0.5);
    this.toiletCountText.x = toiletLayout.iconOffsetX;
    row.addChild(this.toiletCountText);
    
    this.uiLayer.addChild(container);
  }

  _updateToiletCounter() { 
    if (this.toiletCountText) this.toiletCountText.text = `x ${this.toiletCount}`; 
  }

_applyHeroDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this._updateHealthBar();
    
    const hero = this._getHero();
    const anim = hero && hero.currentAnimation ? hero.currentAnimation : '(no-anim)';
    //console.log(`_applyHeroDamage: health=${this.health.toFixed(2)}, heroAnim=${anim}`);
    
    if (this.health <= 0 && hero) {
      // Death - don't play damage sound
      try {
        if (hero.fsm && typeof hero.fsm.setState === 'function') {
            hero.fsm.setState('dead');
        }
      } catch (e) { /* ignore */ }
    } else {
      // If not dead, play damage sound with throttling
      soundManager.playDamage();
    }
}

  _getHero() { 
    return this.characters.find(c => c instanceof Hero) || null; 
  }

  resetAllCharacters() {
    const hero = this._getHero();
    if (hero && typeof hero.resetToInitialState === 'function') {
      hero.resetToInitialState();
    }
    
    const minEnemyDistance = 200;
    const hx = this.playArea.x + this.playArea.width;
    const hy = this.playArea.y + this.playArea.height * 0.5;
    
    for (let character of this.characters) {
      if (character instanceof Enemy) {
        let x, y, dist;
        do {
          x = this.playArea.x + Math.random() * this.playArea.width;
          y = this.playArea.y + Math.random() * this.playArea.height;
          dist = Math.sqrt((x - hx) ** 2 + (y - hy) ** 2);
        } while (dist < minEnemyDistance);
        
        if (typeof character.resetToInitialState === 'function') {
          character.resetToInitialState(x, y);
        }
      }
    }
  }

  async placeToilet(worldPosition) {
    if (this.toiletCount <= 0) return;
    this.toiletCount -= 1; 
    this._updateToiletCounter();
    
    let sprite = null;
    try {
      const tex = await PIXI.Assets.load("images/toilet.png");
      sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(0.5, 1);
      sprite.scale.set(0.5);
    } catch (e) {
      const g = new PIXI.Graphics();
      g.roundRect(-12, -32, 24, 32, 4);
      g.fill({ color: 0x8888FF });
      sprite = g;
    }
    
    sprite.x = worldPosition.x;
    sprite.y = worldPosition.y;
    this.worldContainer.addChild(sprite);
    
    const toilet = {
      isToilet: true,
      position: { x: worldPosition.x, y: worldPosition.y },
      hp: 100,
      maxHp: 100,
      destroyed: false,
      sprite: sprite,
      collisionRadius: 20
    };
    this.toilets.push(toilet);
  }

  _damageToilet(toilet, amount) {
    if (!toilet || toilet.destroyed) return;
    toilet.hp -= amount;
    if (toilet.hp <= 0) {
      toilet.destroyed = true;
      if (toilet.sprite && toilet.sprite.destroy) toilet.sprite.destroy();
    }
  }
}