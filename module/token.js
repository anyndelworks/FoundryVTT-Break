export class BreakTokenDocument extends TokenDocument {

  getBarAttribute(barName, {alternative}={}) {
    const data = super.getBarAttribute(barName, {alternative});
    const attr = alternative || this[barName]?.aptitude;
    if ( !data || !attr || !this.actor ) return data;
    const current = foundry.utils.getProperty(this.actor.system, attr);
    if ( current?.dtype === "Resource" ) data.min = parseInt(current.min || 0);
    data.editable = true;
    return data;
  }

  /* -------------------------------------------- */

  static getTrackedAptitudes(data, _path=[]) {
    if ( data || _path.length ) return super.getTrackedAptitudes(data, _path);
    data = {};
    for ( const model of Object.values(game.system.model.Actor) ) {
      foundry.utils.mergeObject(data, model);
    }
    for ( const actor of game.actors ) {
      if ( actor.isTemplate ) foundry.utils.mergeObject(data, actor.toObject());
    }
    return super.getTrackedAptitudes(data);
  }

}

export class BreakToken extends Token {
  _drawBar(number, bar, data) {
    if (data.attribute === "hearts") return this._drawHeartBar(number, bar, data);

    if ( "min" in data ) {
      // Copy the data to avoid mutating what the caller gave us.
      data = {...data};
      // Shift the value and max by the min to draw the bar percentage accurately for a non-zero min
      data.value -= data.min;
      data.max -= data.min;
    }
    return super._drawBar(number, bar, data);
  }

  _drawHeartBar(number, bar, data) {
    const value = Math.clamp(Number(data.value), 0, Number(data.max));
    const max = Math.max(Number(data.max), 0);
    const {fontSize, gap, posX, posY, scale} = this.#getHeartBarLayout(number, max);

    bar.clear();
    bar.removeChildren();

    if (max === 0) return false;

    for (let i = 0; i < max; i++) {
      const heart = this.#drawHeartIcon(fontSize, i < value, scale);
      heart.position.set(i * (fontSize + gap), 0);
      bar.addChild(heart);
    }

    bar.position.set(posX, posY);
    return true;
  }

  animateHeartDamage(oldValue, newValue) {
    const max = Math.max(Number(this.actor?.system?.hearts?.total ?? 0), 0);
    const from = Math.clamp(Math.ceil(Number(newValue ?? 0)), 0, max);
    const to = Math.clamp(Math.ceil(Number(oldValue ?? 0)), 0, max);
    if (to <= from || !this.bars) return;

    const barNumber = this.document.bar2?.attribute === "hearts" ? 1 : 0;
    const {fontSize, gap, posX, posY, scale} = this.#getHeartBarLayout(barNumber, max);
    const overlay = new PIXI.Container();
    overlay.position.set(posX, posY);
    this.bars.addChild(overlay);

    for (let i = from; i < to; i++) {
      const heart = this.#drawBreakingHeart(fontSize, scale);
      heart.position.set(i * (fontSize + gap), 0);
      heart.animationOffset = (i - from) * 80;
      overlay.addChild(heart);
    }

    this.#animateBreakingHearts(overlay);
  }

  animateHeartHealing(oldValue, newValue) {
    const max = Math.max(Number(this.actor?.system?.hearts?.total ?? 0), 0);
    const from = Math.clamp(Math.ceil(Number(oldValue ?? 0)), 0, max);
    const to = Math.clamp(Math.ceil(Number(newValue ?? 0)), 0, max);
    if (to <= from || !this.bars) return;

    const barNumber = this.document.bar2?.attribute === "hearts" ? 1 : 0;
    const {fontSize, gap, posX, posY, scale} = this.#getHeartBarLayout(barNumber, max);
    const overlay = new PIXI.Container();
    overlay.position.set(posX, posY);
    this.bars.addChild(overlay);

    for (let i = from; i < to; i++) {
      const heart = this.#drawHealingHeart(fontSize, scale);
      heart.position.set(i * (fontSize + gap), 0);
      heart.animationOffset = (i - from) * 90;
      overlay.addChild(heart);
    }

    this.#animateHealingHearts(overlay);
  }

  #getHeartBarLayout(number, max) {
    const {width, height} = this.document.getSize();
    const scale = canvas.dimensions.uiScale;
    const fontSize = Math.max(6, Math.min(18, (width / Math.max(max, 1)) * 0.8)) * scale;
    const gap = 2 * scale;
    const totalWidth = max * fontSize + (max - 1) * gap;
    const posX = Math.max((width - totalWidth) / 2, 0);
    const posY = number === 0 ? height - fontSize - (2 * scale) : 2 * scale;
    return {fontSize, gap, posX, posY, scale};
  }

  #drawHeartIcon(size, filled, scale) {
    const heart = new PIXI.Graphics();
    const half = size / 2;
    const quarter = size / 4;
    const color = filled ? 0xc43c44 : 0xffffff;

    const strokeWidth = Math.clamp(size * 0.08, 0.5 * scale, 1.5 * scale);
    heart.lineStyle(strokeWidth, filled ? 0xffffff : 0xc43c44, 1);
    heart.beginFill(color, filled ? 1 : 0.88);
    heart.moveTo(half, size * 0.9);
    heart.bezierCurveTo(-quarter, size * 0.45, 0, size * 0.05, half, size * 0.28);
    heart.bezierCurveTo(size, size * 0.05, size + quarter, size * 0.45, half, size * 0.9);
    heart.endFill();

    return heart;
  }

  #drawBreakingHeart(size, scale) {
    const container = new PIXI.Container();
    const heart = this.#drawHeartIcon(size, true, scale);
    const crack = this.#drawHeartCrack(size, scale);
    container.addChild(heart, crack);

    const shardCount = 5;
    for (let i = 0; i < shardCount; i++) {
      const shard = this.#drawHeartShard(size, scale);
      shard.position.set(size / 2, size / 2);
      shard.basePosition = {x: size / 2, y: size / 2};
      shard.rotation = (Math.PI * 2 * i) / shardCount;
      shard.velocity = {
        x: Math.cos(shard.rotation) * (size * (0.18 + i * 0.025)),
        y: Math.sin(shard.rotation) * (size * 0.12) - (size * 0.08)
      };
      container.addChild(shard);
    }

    return container;
  }

  #drawHeartCrack(size, scale) {
    const crack = new PIXI.Graphics();
    const strokeWidth = Math.clamp(size * 0.08, 0.6 * scale, 1.8 * scale);
    crack.lineStyle(strokeWidth, 0xffffff, 0.95);
    crack.moveTo(size * 0.52, size * 0.22);
    crack.lineTo(size * 0.44, size * 0.42);
    crack.lineTo(size * 0.57, size * 0.54);
    crack.lineTo(size * 0.47, size * 0.76);
    return crack;
  }

  #drawHeartShard(size, scale) {
    const shard = new PIXI.Graphics();
    const shardSize = Math.max(2 * scale, size * 0.12);
    shard.beginFill(0xc43c44, 0.95);
    shard.lineStyle(Math.max(0.4 * scale, 1), 0xffffff, 0.85);
    shard.moveTo(0, -shardSize);
    shard.lineTo(shardSize * 0.75, shardSize * 0.65);
    shard.lineTo(-shardSize * 0.75, shardSize * 0.65);
    shard.lineTo(0, -shardSize);
    shard.endFill();
    return shard;
  }

  #drawHealingHeart(size, scale) {
    const container = new PIXI.Container();
    const glow = new PIXI.Graphics();
    glow.beginFill(0xfff0f2, 0.5);
    glow.drawCircle(size / 2, size / 2, size * 0.62);
    glow.endFill();
    glow.blendMode = PIXI.BLEND_MODES.ADD;

    const heart = this.#drawHeartIcon(size, true, scale);
    const sparkleCount = 4;
    container.addChild(glow, heart);

    for (let i = 0; i < sparkleCount; i++) {
      const sparkle = this.#drawHealingSparkle(size, scale);
      const angle = (Math.PI * 2 * i) / sparkleCount;
      sparkle.position.set(
        (size / 2) + Math.cos(angle) * size * 0.42,
        (size / 2) + Math.sin(angle) * size * 0.32
      );
      sparkle.basePosition = {x: sparkle.x, y: sparkle.y};
      sparkle.velocity = {
        x: Math.cos(angle) * size * 0.12,
        y: Math.sin(angle) * size * 0.12
      };
      container.addChild(sparkle);
    }

    container.alpha = 0;
    container.scale.set(0.6);
    container.y = size * 0.25;
    return container;
  }

  #drawHealingSparkle(size, scale) {
    const sparkle = new PIXI.Graphics();
    const sparkleSize = Math.max(1.5 * scale, size * 0.08);
    sparkle.beginFill(0xffffff, 0.95);
    sparkle.moveTo(0, -sparkleSize);
    sparkle.lineTo(sparkleSize * 0.35, -sparkleSize * 0.35);
    sparkle.lineTo(sparkleSize, 0);
    sparkle.lineTo(sparkleSize * 0.35, sparkleSize * 0.35);
    sparkle.lineTo(0, sparkleSize);
    sparkle.lineTo(-sparkleSize * 0.35, sparkleSize * 0.35);
    sparkle.lineTo(-sparkleSize, 0);
    sparkle.lineTo(-sparkleSize * 0.35, -sparkleSize * 0.35);
    sparkle.lineTo(0, -sparkleSize);
    sparkle.endFill();
    sparkle.blendMode = PIXI.BLEND_MODES.ADD;
    return sparkle;
  }

  #animateBreakingHearts(overlay) {
    const duration = 650;
    const startedAt = performance.now();
    const tick = (now) => {
      let active = false;
      for (const heart of overlay.children) {
        const elapsed = now - startedAt - heart.animationOffset;
        if (elapsed < 0) {
          active = true;
          continue;
        }
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        heart.alpha = 1 - easeOut;
        heart.scale.set(1 + (0.35 * Math.sin(progress * Math.PI)));
        heart.rotation = Math.sin(progress * Math.PI * 5) * 0.12;
        heart.y = -8 * easeOut;

        for (const child of heart.children) {
          if (!child.velocity) continue;
          child.x = child.basePosition.x + (child.velocity.x * easeOut);
          child.y = child.basePosition.y + (child.velocity.y * easeOut) + (12 * progress * progress);
          child.alpha = 1 - progress;
        }
        if (progress < 1) active = true;
      }

      if (active) {
        requestAnimationFrame(tick);
      } else {
        overlay.destroy({children: true});
      }
    };
    requestAnimationFrame(tick);
  }

  #animateHealingHearts(overlay) {
    const duration = 700;
    const startedAt = performance.now();
    const tick = (now) => {
      let active = false;
      for (const heart of overlay.children) {
        const elapsed = now - startedAt - heart.animationOffset;
        if (elapsed < 0) {
          active = true;
          continue;
        }
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const pulse = Math.sin(progress * Math.PI * 2);
        heart.alpha = progress < 0.82 ? Math.min(progress * 4, 1) : 1 - ((progress - 0.82) / 0.18);
        heart.scale.set(0.65 + (0.45 * easeOut) + (0.08 * pulse));
        heart.y = (heart.height * 0.18) * (1 - easeOut);

        for (const child of heart.children) {
          if (!child.velocity) continue;
          child.x = child.basePosition.x + (child.velocity.x * easeOut);
          child.y = child.basePosition.y + (child.velocity.y * easeOut);
          child.alpha = 1 - progress;
          child.rotation += 0.08;
        }
        if (progress < 1) active = true;
      }

      if (active) {
        requestAnimationFrame(tick);
      } else {
        overlay.destroy({children: true});
      }
    };
    requestAnimationFrame(tick);
  }

  _onControl(options = {}) {
    game.break.activeEffectPanel.render();
    return super._onControl(options);
  }

  _onRelease(options) {
    game.break.activeEffectPanel.render();
    return super._onRelease(options);
  }

}
