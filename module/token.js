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
    const {width, height} = this.document.getSize();
    const s = canvas.dimensions.uiScale;
    const fontSize = Math.max(6, Math.min(18, (width / Math.max(max, 1)) * 0.8)) * s;
    const gap = 2 * s;

    bar.clear();
    bar.removeChildren();

    if (max === 0) return false;

    for (let i = 0; i < max; i++) {
      const heart = this.#drawHeartIcon(fontSize, i < value, s);
      heart.position.set(i * (fontSize + gap), 0);
      bar.addChild(heart);
    }

    const totalWidth = max * fontSize + (max - 1) * gap;
    const posX = Math.max((width - totalWidth) / 2, 0);
    const posY = number === 0 ? height - fontSize - (2 * s) : 2 * s;
    bar.position.set(posX, posY);
    return true;
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

  _onControl(options = {}) {
    game.break.activeEffectPanel.render();
    return super._onControl(options);
  }

  _onRelease(options) {
    game.break.activeEffectPanel.render();
    return super._onRelease(options);
  }

}
