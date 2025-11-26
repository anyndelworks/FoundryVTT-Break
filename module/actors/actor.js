import { RollBonuses, RollType, roll } from "../../utils/dice.js";
import BREAK from "../constants.js";
import Action from "../system/action.js";
import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";

/**
 * Extend the base Actor document to support aptitudes and groups with a custom template creation dialog.
 * @extends {Actor}
 */
export class BreakActor extends Actor {

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.system.computeDerivedData(this);
    this.system.updateSource(this.system.toObject());
  }

  async _preCreate(data, options, user) {

    await super._preCreate(data, options, user);

    let initData = {};

    if (data.type === "character") {
      initData["prototypeToken.actorLink"] = true;
    }

    this.updateSource(initData);
  }

  prepareData(){
    super.prepareData();
    console.log(this.system);

    if(canvas.ready) {
      const thisTokenIsControlled = canvas.tokens.controlled.some(
        (t) => t.document.actorId == this._id);

      if (thisTokenIsControlled) {
        game.break.activeEffectPanel.render();
      }
    }
  }
  
  async setAptitudeTrait(aptitudeKey, traitValue) {
    const updates = {};
    updates[`system.aptitudes.${aptitudeKey}.trait`] = traitValue;
    await this.update(updates)
    return this
  }

  async deleteItem(id) {
    const item = this.items.find(i => i._id == id);
    if(item) {
      this.unequipItem(id, item.type);
      await this.deleteEmbeddedDocuments("Item", [id]);
    }
    return this
  }

  async unequipItem(id, type)
  {
    const updates = {};
    const item = this.items.get(id);
    item?.effects?.forEach(effect => {
      effect.update({disabled: true});
    });
    if (Array.isArray(this.system.equipment[type])) {
      var itemIndex = this.system.equipment[type].findIndex((element) => element._id == id);
      if (itemIndex != -1)
      {
        this.system.equipment[type].splice(itemIndex, 1)
        updates[`system.equipment.${type}`] = this.system.equipment[type];
      }
    }
    else {
      if (this.system.equipment[type]?._id === id) {
        updates[`system.equipment.${type}`] = null;
      }
    }

    this.update(updates);
  }

  async rollAptitude(aptitudeId) {
    const aptitude = this.system.aptitudes[aptitudeId];
    const targetValue = +aptitude.value + +aptitude.bon + +aptitude.trait;

    new Dialog({
      title: "Roll " +game.i18n.localize(aptitude.label)+ " check",
      content: await foundry.applications.handlebars.renderTemplate("systems/break/templates/rolls/roll-dialog.hbs",{bonuses: RollBonuses, aptitude: true}),
      buttons: {
        roll: {
          label: game.i18n.localize("BREAK.Roll"),
          callback: async (html) => {
            const form = html[0].querySelector("form");
            const flavor = form.rollType.value === RollType.CHECK ? game.i18n.format("BREAK.AptitudeCheck", {aptitude:  game.i18n.localize(aptitude.label)}) : game.i18n.format("BREAK.AptitudeContest", {aptitude:  game.i18n.localize(aptitude.label)});
            return roll(flavor, form.rollType.value, targetValue, form.edge.value, form.bonus.value, form.customBonus.value);
          }
        }
      }
    }).render(true);
  }

  async rollAttack(bonus, extraDamage, weaponName = "") {
    const attack = +this.system.attack.value + +this.system.attack.bon + +bonus;
    let flavor = game.i18n.format("BREAK.Attacks");
    new Dialog({
      title: "Roll attack",
      content: await foundry.applications.handlebars.renderTemplate("systems/break/templates/rolls/roll-dialog.hbs",{bonuses: RollBonuses, aptitude: false, limited: true}),
      buttons: {
        roll: {
          label: game.i18n.localize("BREAK.Roll"),
          callback: async (html) => {
            const form = html[0].querySelector("form");
            let targetValue = -1;
            const target = game.users.get(game.userId).targets.size > 0 ? game.users.get(game.userId).targets.first() : null;
            if(target && target.actor.system.defense != null) {
              targetValue = target.actor.system.defense.value + target.actor.system.defense.bon;
              flavor = game.i18n.format("BREAK.ActorAttacksActor", {name: this.name, target: target.document.name});
            }
            if(weaponName) {
              flavor = `${flavor} with ${weaponName}`;
            }
            return roll(flavor, RollType.ATTACK, targetValue, form.edge.value, form.bonus.value, form.customBonus.value, attack, +extraDamage);
          }
        }
      }
    }).render(true);
  }

  async modifyHp(amount) {
    if(this.system.hearts.value + amount >= 0 && this.system.hearts.value + amount <= (this.system.hearts.max + this.system.hearts.bon)) {
      const updates = {"system.hearts.value": this.system.hearts.value+amount}
      await this.update(updates)
    }
    return this
  }

  async useAction(itemId, actionId) {
    const item = this.items.find(i => i._id == itemId);
    const action = item.system.actions.find(a => a.id === actionId);
    const aptitude = action.aptitude ? this.system.aptitudes[action.aptitude] : null;
    const checkTargetValue = +aptitude?.value + +aptitude?.bon + +aptitude?.trait;
    console.log(action);
    Action.sendToChat(action, this.name);
    switch(action.rollType){
      case BREAK.roll_types.none.key:
        break;
      case BREAK.roll_types.contest.key:
        new Dialog({
          title: action.name,
          content: await foundry.applications.handlebars.renderTemplate("systems/break/templates/rolls/roll-dialog.hbs",{bonuses: RollBonuses, aptitude: true, limited: true, defaultContest: true}),
          buttons: {
            roll: {
              label: game.i18n.localize("BREAK.Roll"),
              callback: async (html) => {
                const form = html[0].querySelector("form");
                const flavor = `${action.name} ${game.i18n.format("BREAK.AptitudeContest", {aptitude:  game.i18n.localize(aptitude.label)})}`;
                return roll(flavor, form.rollType.value, checkTargetValue, form.edge.value, form.bonus.value, form.customBonus.value);
              }
            }
          }
        }).render(true);
        break;
      case BREAK.roll_types.attack.key:
        this.rollAttack(0, 0, action.name);
        break;
      case BREAK.roll_types.check.key:
        new Dialog({
          title: action.name,
          content: await foundry.applications.handlebars.renderTemplate("systems/break/templates/rolls/roll-dialog.hbs",{bonuses: RollBonuses, aptitude: true, limited: true, defaultCheck: true}),
          buttons: {
            roll: {
              label: game.i18n.localize("BREAK.Roll"),
              callback: async (html) => {
                const form = html[0].querySelector("form");
                const flavor = `${action.name} ${game.i18n.format("BREAK.AptitudeCheck", {aptitude:  game.i18n.localize(aptitude.label)})}`;
                return roll(flavor, form.rollType.value, checkTargetValue, form.edge.value, form.bonus.value, form.customBonus.value);
              }
            }
          }
        }).render(true);
        break;
    }
  }

  onEmbedItem(item) {
    switch(this.type) {
      case "character":
        this.onEmbedItemCharacter(item);
        break;
    }
  }

  async onEmbedItemCharacter(item) {
    let abilityUuids;
    let abilities;
    switch(item.type) {
      case "history":
        const purviews = item.system.purviews ?? [];
        this.update({"system.purviews": [...this.system.purviews, ...purviews]});
        const picks = item.system.gearPicks ?? 0;
        const startingGear = item.system.startingGear ?? [];
        if (!picks || !startingGear.length) return;
        const gearItems = await Promise.all(startingGear.map(i => fromUuid(i.uuid)));
        gearItems.forEach(g => {g.from = item.name});
        new FeatureSelectionDialog({
          itemType: "item",
          picks,
          document: this,
          predefinedList: gearItems,
          filters: []
        }).render(true);
        break;
      case "species":
        abilityUuids = (item.system.abilities ?? []);
        abilities = await Promise.all(abilityUuids.map(uuid => fromUuid(uuid)));
        const innateAbilities = abilities.filter(a => a?.system.subtype === "innate");
        this.createEmbeddedDocuments("Item", innateAbilities);
        break;
      case "calling":
        const abilityUuids = (item.system.abilities ?? []);
        const abilities = await Promise.all(abilityUuids.map(uuid => fromUuid(uuid)));
        const startingAbiligites = abilities.filter(a => a?.system.subtype === "starting");
        this.createEmbeddedDocuments("Item", startingAbiligites);
        break;
    }
  }

  /** @inheritdoc */
  async _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    if(data.system?.hearts?.bon != null && (this.system.hearts.max + data.system.hearts.bon) < this.system.hearts.value) {
      this.update({"system.hearts.value": this.system.hearts.max + data.system.hearts.bon})
    }
    if(data.system?.history) {
      this.update({"system.purviews": data.system?.history.system.purviews.join("\n")});
    }
  }

}