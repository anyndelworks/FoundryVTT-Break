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
    if ( "min" in data ) {
      // Copy the data to avoid mutating what the caller gave us.
      data = {...data};
      // Shift the value and max by the min to draw the bar percentage accurately for a non-zero min
      data.value -= data.min;
      data.max -= data.min;
    }
    return super._drawBar(number, bar, data);
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

