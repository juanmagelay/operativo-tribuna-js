class GameObject {
    //Properties
    id;
    position = { x: 0, y: 0 };
    velocity = { x: 0, y: 0 };
    acceleration = { x: 0, y: 0 };
    maxAcceleration = 0.2;
    maxVelocity = 3;
    velocityMagnitude;

    //Animation & display
    container;                 // PIXI.Container that holds the animated sprites
    spritesAnimated = {};      // { walk: AnimatedSprite, back: ..., front: ..., idle: ... }
    currentAnimation = null;
    spritesheetData = null;
    angle;
    
    //Constructor
    constructor ( spritesheetData, x, y, game ) {
        //Save a reference to the game instance.
        this.game = game;
        
        //Save a reference to the spritesheet data
        this.spritesheetData = spritesheetData;

        //Container
        this.container = new PIXI.Container();
        this.container.name = "container";
        
        //Vectors
        this.position = { x: x, y: y };
        this.velocity = { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 };
        this.acceleration = { x: 0, y: 0 };

        //Generate a character ID
        this.id = Math.floor(Math.random() * 99999999);

        // Build an AnimatedSprite for each animation defined in the JSON
        // spritesheetData.animations is an object: { idle: [...], walk:[...], ... }
        for (let key of Object.keys(this.spritesheetData.animations)) {
            // PIXI.Assets.load provides ready textures arrays for animations in many setups,
            // so we pass the array directly to AnimatedSprite (this matches Pixi usage).
            const textures = this.spritesheetData.animations[key];
            const anim = new PIXI.AnimatedSprite(textures);
            anim.anchor.set(0.5, 1);      // center-bottom anchor (adjust if you prefer center)
            anim.animationSpeed = 0.12;
            anim.loop = true;
            anim.scale.set(2);           // scale up for visibility — change if too big
            anim.visible = false;        // we'll show the chosen one
            anim.play();                 // keep it playing (visible will control if it's shown)
            this.spritesAnimated[key] = anim;
            this.container.addChild(anim);
        }

        // Add container to world container
        this.game.worldContainer.addChild(this.container);
        
        // Start with "idle" if available, otherwise the first animation
        if (this.spritesAnimated.idle) this.changeAnimation("idle");
        else {
            const first = Object.keys(this.spritesAnimated)[0];
            if (first) this.changeAnimation(first);
        }
        
        //Collision
        this.collisionRadius = 18;
        this.isSolid = true;
        this.canPushOthers = true;
    }

    //Switch animation (keeps previous visible states off)
    changeAnimation(name) {
        if (this.currentAnimation === name) return;

        if (!this.spritesAnimated[name]) {
          console.warn("Unknown animation:", name);
          return;
        }

        for (let k of Object.keys(this.spritesAnimated)) {
          this.spritesAnimated[k].visible = false;
        }

      this.spritesAnimated[name].visible = true;
      this.currentAnimation = name;
    }

    // Safely flip the currently active animation horizontally based on velocity.x
    _applyHorizontalFlip() {
      try {
        const name = this.currentAnimation;
        if (!name) return;
        const sprite = this.spritesAnimated && this.spritesAnimated[name];
        if (!sprite || !sprite.scale) return;
        sprite.scale.x = (this.velocity && this.velocity.x < 0) ? -Math.abs(sprite.scale.x) : Math.abs(sprite.scale.x);
      } catch (e) {
        console.warn('applyHorizontalFlip failed', e);
      }
    }

    //Tick: This method tick is executed in every frame.
    tick() {
        //Acceleration
        this.acceleration.x = 0;
        this.acceleration.y = 0;
        
        // Allow subclasses to perceive the environment (populate FSM state decisions)
        if (typeof this.perceiveEnvironment === 'function') {
          try { this.perceiveEnvironment(); } catch (e) { console.error('perceiveEnvironment error', e); }
        }
        // If object has a FSM, update it so it can set states/animations and also modify acceleration
        if (this.fsm && typeof this.fsm.update === 'function') {
          try { this.fsm.update(this.game?.pixiApp?.ticker?.deltaMS || (1000/60)); } catch (e) { console.error('fsm.update error', e); }
        }

        // Decide acceleration via subclass brain (IA or input)
        this.applyBrain();
        this.limitAcceleration();

        //Integrate with deltaTime
        this.velocity.x += this.acceleration.x * this.game.pixiApp.ticker.deltaTime;
        this.velocity.y += this.acceleration.y * this.game.pixiApp.ticker.deltaTime;

        //Velocity variations
        this.applyFriction();
        this.limitVelocity();

        //Pixels per frame with deltaTime
        this.position.x += this.velocity.x * this.game.pixiApp.ticker.deltaTime;
        this.position.y += this.velocity.y * this.game.pixiApp.ticker.deltaTime;

        //Save the angle to show the correct animation
        this.angle = radiansToDegrees(
            Math.atan2(this.velocity.y, this.velocity.x) //This is backguards y, x
        );
        
        // Update animation based on movement direction
        this.velocityMagnitude = Math.sqrt(
            this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
        );

        // Allow subclasses to perceive the environment (populate FSM state decisions)
        if (typeof this.perceiveEnvironment === 'function') {
          try { this.perceiveEnvironment(); } catch (e) { console.error('perceiveEnvironment error', e); }
        }
        // If object has a FSM, update it so it can set states/animations based on current physics
        if (this.fsm && typeof this.fsm.update === 'function') {
          try { this.fsm.update(this.game?.pixiApp?.ticker?.deltaMS || (1000/60)); } catch (e) { console.error('fsm.update error', e); }
        }

        //Bounds
        this._applyBounds();

        //Collision
        this._handleCollisions();
    }

    // Hook for subclasses (Enemy/Hero) to set acceleration each frame
    applyBrain() {}

    
    //Functions
    
    limitAcceleration() {
        this.acceleration = limitVector(this.acceleration, this.maxAcceleration);
    }

    limitVelocity() {
        this.velocity = limitVector(this.velocity, this.maxVelocity);
    }

    applyFriction() {
      const friction = Math.pow(0.95, this.game.pixiApp.ticker.deltaTime);
      this.velocity.x *= friction;
      this.velocity.y *= friction;
    } 

    render() {
      // move container to current position
      this.container.x = this.position.x;
      this.container.y = this.position.y;

      // z-order
      this.container.zIndex = Math.round(this.position.y);

      // Decide which animation should play based on velocity and angle
      this._updateAnimationBasedOnMovement();

      // Update animation speed to reflect velocity
      this._updateAnimationSpeed();
    }

    _updateAnimationBasedOnMovement() {
      const speed = this.velocityMagnitude || 0;
      // If this object has a FSM active, do not override the animation here
      if (this.fsm && this.fsm.isActive()) {
        return;
      }
      const threshold = 0.2; // below this, we consider the object idle

      if (speed < threshold) {
        // idle
        if (this.spritesAnimated.idle) this.changeAnimation("idle");
        return;
      }

      // angle is degrees from Math.atan2(y, x)
      const a = this.angle;

      // Down on screen is positive Y (canvas coords), so:
      // - moving down (front): angle between 45 and 135
      // - moving up (back): angle between -135 and -45
      // - otherwise: horizontal -> use walk (flip X to mirror)
      if ( a > 45 && a < 135 ) {
        if ( this.spritesAnimated.front ) this.changeAnimation("front");
      } else if (a < -45 && a > -135) {
        if ( this.spritesAnimated.back ) this.changeAnimation("back");
      } else {
        // horizontal-ish
        if ( this.spritesAnimated.walk ) this.changeAnimation("walk");
        // flip horizontally if going left
        const spriteForWalk = this.spritesAnimated.walk;
        if ( spriteForWalk ) {
          spriteForWalk.scale.x = (this.velocity.x < 0) ? -Math.abs(spriteForWalk.scale.x) : Math.abs(spriteForWalk.scale.x);
        }
      }
    }  

    _updateAnimationSpeed() {
      // Velocity of animation proportional to real velocity + deltaTime
      for (let k of Object.keys(this.spritesAnimated)) {
        this.spritesAnimated[k].animationSpeed = 
          this.velocityMagnitude * 0.05 * this.game.pixiApp.ticker.deltaTime;
      }
    }

    //Bounds
    _applyBounds() {
      if (!this.game || !this.game.playArea) return;
      const bounds = this.game.playArea;
      //X: equal for all
      if (this.position.x < bounds.x) {
        this.position.x = bounds.x;
        if (this.velocity) this.velocity.x = 0;
      }
      if (this.position.x > bounds.x + bounds.width) {
        this.position.x = bounds.x + bounds.width;
        if (this.velocity) this.velocity.x = 0;
      }
      //Y: adjusts the upper limit for hero/enemy based on the sprite size
      let minY = bounds.y;
      if ((this instanceof Hero || this instanceof Enemy) && this.container && this.container.height) {
        //The anchor is at the base (y=1), so the center of the sprite must be inside
        minY = bounds.y + this.container.height * 0.5;
      }
      if (this.position.y < minY) {
        this.position.y = minY;
        if (this.velocity) this.velocity.y = 0;
      }
      if (this.position.y > bounds.y + bounds.height) {
        this.position.y = bounds.y + bounds.height;
        if (this.velocity) this.velocity.y = 0;
      }
    }

    _handleCollisions() {
    if (this.isJumping) return;
    if (!this.isSolid) return;
    // Collision with other solid characters
    for (let other of this.game.characters) {
      if (other.isJumping) {
        console.log("is jumping"); 
        return;
      };
      if (other === this) continue;
      if (!other.isSolid) continue;
      const collision = checkCircleCollision(
        this.position, 
        other.position, 
        this.collisionRadius, 
        other.collisionRadius
      );
      if (collision) {
        // 1. Enemy collide with Hero: only damage, DOES NOT move it
        if (this instanceof Enemy && other instanceof Hero) {
          if (this.game && typeof this.game._applyHeroDamage === 'function') {
            const deltaSeconds = (this.game.pixiApp.ticker.deltaMS || (1000/60)) / 1000;
            this.game._applyHeroDamage(6 * deltaSeconds);
          }
          // DO NOT separate or modify the speed of the Hero
          continue;
        }
        // 2. Hero collide with Enemy: he only moves it if pressing an arrow
        if (this instanceof Hero && other instanceof Enemy) {
          if (this.game && typeof this.game._applyHeroDamage === 'function') {
            const deltaSeconds = (this.game.pixiApp.ticker.deltaMS || (1000/60)) / 1000;
            this.game._applyHeroDamage(6 * deltaSeconds);
          }
          // He only moves it if pressing an arrow
          if (this.input && (this.input.up || this.input.down || this.input.left || this.input.right)) {
            separateObjects(
              this.position, 
              other.position, 
              this.collisionRadius, 
              other.collisionRadius,
              this, other
            );
            this._resolveCollisionVelocity(other);
          }
          continue;
        }
        // Separate and solve velocity normally for other cases
        separateObjects(
          this.position, 
          other.position, 
          this.collisionRadius, 
          other.collisionRadius,
          this, other
        );
        this._resolveCollisionVelocity(other);
      }
    }
  
  //Collisions with toilets
  const activeToilets = this.game.toilets.filter(t => !t.destroyed);
  for (let toilet of activeToilets) {
    //Toilet collision radius
    const toiletRadius = toilet.collisionRadius || 20;
    const collision = checkCircleCollision(
      this.position, 
      toilet.position, 
      this.collisionRadius, 
      toiletRadius
    );
    if (collision) {
      // 3. If the object is Enemy, it hurts the toilet
      if (this instanceof Enemy) {
        if (this.game && typeof this.game._damageToilet === 'function') {
          const deltaSeconds = (this.game.pixiApp.ticker.deltaMS || (1000/60)) / 1000;
          this.game._damageToilet(toilet, 20 * deltaSeconds);
        }
      }
      // 4. Neither the hero nor the enemy can get through the toilet
      const dx = this.position.x - toilet.position.x;
      const dy = this.position.y - toilet.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0) {
        const overlap = (this.collisionRadius + toiletRadius) - distance;
        this.position.x += (dx / distance) * overlap;
        this.position.y += (dy / distance) * overlap;
      }
      // Zero speed if it hits the toilet
      const dotProduct = this.velocity.x * dx + this.velocity.y * dy;
      if (dotProduct < 0) {
        this.velocity.x = 0;
        this.velocity.y = 0;
      }
    }
  }
}

  _resolveCollisionVelocity(other) {
    const dx = this.position.x - other.position.x;
    const dy = this.position.y - other.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const nx = dx / distance;
    const ny = dy / distance;
    const dvx = this.velocity.x - other.velocity.x;
    const dvy = this.velocity.y - other.velocity.y;
    const dotProduct = dvx * nx + dvy * ny;
    
    if (dotProduct > 0) return;
    
    const impulse = dotProduct * 0.5;
    this.velocity.x -= impulse * nx;
    this.velocity.y -= impulse * ny;
    
    if (other.canPushOthers) {
      other.velocity.x += impulse * nx;
      other.velocity.y += impulse * ny;
    }
  }
}
