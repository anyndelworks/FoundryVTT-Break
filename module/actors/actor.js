import { RollBonuses, RollType, roll } from "../../utils/dice.js";
import BREAK from "../constants.js";
import Action from "../system/action.js";
import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";

const { DialogV2 } = foundry.applications.api;

/**
 * Extend the base Actor document to support aptitudes and groups with a custom template creation dialog.
 * @extends {Actor}
 */
export class BreakActor extends Actor {

  /** @inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();
    this.system.computeBaseData?.(this);
  }

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.system.computeDerivedData(this);
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
      await this.unequipItem(id, item.type);
      await this.deleteEmbeddedDocuments("Item", [id]);
    }
    return this
  }

  async unequipItem(id, type)
  {
    const updates = {};
    const item = this.items.get(id);
    await Promise.all(item?.effects?.map(effect => effect.update({disabled: true})) ?? []);
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

    if(!foundry.utils.isEmpty(updates)) {
      await this.update(updates);
    }
  }

  async rollAptitude(aptitudeId) {
    const aptitude = this.system.aptitudes[aptitudeId];
    const targetValue = +aptitude.total;

    new DialogV2({
      window: { title: "Roll " +game.i18n.localize(aptitude.label)+ " check" },
      content: await foundry.applications.handlebars.renderTemplate("systems/break/templates/rolls/roll-dialog.hbs",{bonuses: RollBonuses, aptitude: true}),
      buttons: [{
        action: "roll",
        label: "BREAK.Roll",
        icon: "fa-solid fa-dice-d20",
        default: true,
        callback: async (event, button) => {
          const form = button.form.elements;
          const flavor = form.rollType.value === RollType.CHECK ? game.i18n.format("BREAK.AptitudeCheck", {aptitude:  game.i18n.localize(aptitude.label)}) : game.i18n.format("BREAK.AptitudeContest", {aptitude:  game.i18n.localize(aptitude.label)});
          return roll(flavor, form.rollType.value, targetValue, form.edge.value, form.bonus.value, form.customBonus.value);
        }
      }]
    }).render({force: true});
  }

  async rollAttack(bonus, extraDamage, resolveAction = null, weaponName = "", ammo = null) {
    const attackModifier = ammo?.system.special ? BREAK.ammo_attack_modifiers[ammo.system.attackModifier] : null;
    const damageModifier = ammo?.system.special ? ammo.system.damageModifier : 0;
    const attack = +this.system.attack.total + +bonus;
    const modifiedExtraDamage = Math.max(0, +extraDamage - +damageModifier);
    let flavor = game.i18n.format("BREAK.Attacks");
    new DialogV2({
      window: { title: "Roll attack" },
      content: await foundry.applications.handlebars.renderTemplate("systems/break/templates/rolls/roll-dialog.hbs",{
        bonuses: RollBonuses,
        aptitude: false,
        limited: true,
        defaultEdge: attackModifier?.edge,
        defaultBonus: attackModifier?.bonus
      }),
      buttons: [{
        action: "roll",
        label: "BREAK.Roll",
        icon: "fa-solid fa-dice-d20",
        default: true,
        callback: async (event, button) => {
          const form = button.form.elements;
          let targetValue = -1;
          const target = game.users.get(game.userId).targets.size > 0 ? game.users.get(game.userId).targets.first() : null;
          if(target && target.actor.system.defense != null) {
            targetValue = target.actor.system.defense.total;
            flavor = game.i18n.format("BREAK.ActorAttacksActor", {name: this.name, target: target.document.name});
          }
          if(weaponName) {
            flavor = `${flavor} with ${weaponName}`;
          }
          if(ammo) {
            flavor = `${flavor} (${ammo.name})`;
          }
          const result = await roll(flavor, RollType.ATTACK, targetValue, form.edge.value, form.bonus.value, form.customBonus.value, attack, modifiedExtraDamage);
          if(result?.hit && target?.actor && ammo?.system.special && ammo.system.check?.enabled) {
            await this.#notifyAmmoTargetCheck(target.actor, ammo);
          }
          if(result?.hit && target?.actor) {
            await this.#notifyAttackDamage(target.actor, weaponName || game.i18n.localize("BREAK.Attack"), ammo, result.extraDamageHit);
          }
          await this.consumeAmmo(ammo);
          if(resolveAction) {
            await resolveAction(result?.hit);
          }
        }
      }]
    }).render({force: true});
  }

  async #notifyAttackDamage(targetActor, weaponName, ammo, extraDamageHit = false) {
    const damageModifier = ammo?.system.special ? Number(ammo.system.damageModifier) || 0 : 0;
    const damage = Math.max(0, 1 + damageModifier + (extraDamageHit ? 1 : 0));
    const data = {
      weaponName,
      targetName: targetActor.name,
      targetActorUuid: targetActor.uuid,
      damage,
      resolved: false
    };
    const content = await foundry.applications.handlebars.renderTemplate("systems/break/templates/chat/attack-damage.html", data);
    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      whisper: ChatMessage.getWhisperRecipients("GM"),
      flavor: weaponName,
      content,
      flags: {
        break: {
          attackDamage: data
        }
      }
    });
  }

  async consumeAmmo(ammo) {
    if(!ammo) return;
    const ammoName = ammo.name;
    const currentQuantity = ammo.system?.quantity ?? 1;
    const remainingQuantity = currentQuantity - 1;
    if(remainingQuantity <= 0) {
      await ammo.delete();
    } else {
      await ammo.update({"system.quantity": remainingQuantity});
    }
    ui.notifications.info(game.i18n.format("BREAK.AMMO.Consumed", {
      ammo: ammoName,
      quantity: Math.max(remainingQuantity, 0)
    }));
  }

  async #notifyAmmoTargetCheck(targetActor, ammo) {
    const aptitude = targetActor.system.aptitudes[ammo.system.check.aptitude];
    if(!aptitude) return;
    const effectData = this.#getAmmoEffectData(ammo);
    const data = {
      ammoName: ammo.name,
      targetName: targetActor.name,
      targetActorUuid: targetActor.uuid,
      aptitude: ammo.system.check.aptitude,
      aptitudeLabel: game.i18n.localize(aptitude.label),
      modifier: ammo.system.check.modifier,
      modifierLabel: game.i18n.localize(BREAK.ammo_attack_modifiers[ammo.system.check.modifier]?.label ?? "BREAK.None"),
      effectData,
      resolved: false
    };
    const content = await foundry.applications.handlebars.renderTemplate("systems/break/templates/chat/ammo-check.html", data);
    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this }),
      whisper: Action.getOwnerOrGMRecipients(targetActor),
      flavor: ammo.name,
      content,
      flags: {
        break: {
          ammoCheck: data
        }
      }
    });
  }

  #getAmmoEffectData(ammo) {
    const effects = ammo.effects?.contents ?? [];
    return effects.map(effect => {
      const data = effect.toObject();
      delete data._id;
      data.disabled = false;
      data.origin = ammo.uuid;
      return data;
    });
  }

  async modifyHp(amount) {
    if(this.system.hearts.value + amount >= 0 && this.system.hearts.value + amount <= this.system.hearts.total) {
      const updates = {"system.hearts.value": this.system.hearts.value+amount}
      await this.update(updates)
    }
    return this
  }

  async useAction(itemId, actionId) {
    const item = this.items.find(i => i._id == itemId);
    const action = Action.normalize(item.system.actions.find(a => a.id === actionId));
    const targetActor = Action.getTargetActor(action, this);
    const resolveAction = async (applyEffects = true) => {
      if (!await Action.payCosts(this, action)) return false;
      if (applyEffects) return Action.applyEffect(this, item, action);
      return true;
    };
    Action.sendToChat(action, this.name);
    if(action.target === BREAK.action_targets.area.key || action.rollType === BREAK.roll_types.contest.key) {
      ui.notifications.info(game.i18n.localize("BREAK.ACTION.ManualResolution"));
      return;
    }
    switch(action.rollType){
      case BREAK.roll_types.none.key:
        await resolveAction();
        break;
      case BREAK.roll_types.attack.key:
        if(action.target === BREAK.action_targets.target.key && !targetActor) {
          ui.notifications.warn(game.i18n.localize("BREAK.ACTION.TargetMissing"));
          return;
        }
        this.rollAttack(0, 0, resolveAction, action.name);
        break;
      case BREAK.roll_types.check.key:
        if(!targetActor) {
          ui.notifications.warn(game.i18n.localize("BREAK.ACTION.TargetMissing"));
          return;
        }
        if(!Action.checkRequirements(this, action)) return;
        await Action.notifyTargetCheck(this, item, action, targetActor);
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
        await this.update({"system.size.value": item.system.size ?? null});
        await this.createEmbeddedDocuments("Item", innateAbilities);
        break;
      case "calling":
        abilityUuids = (item.system.abilities ?? []);
        abilities = await Promise.all(abilityUuids.map(uuid => fromUuid(uuid)));
        const startingAbiligites = abilities.filter(a => a?.system.subtype === "starting");
        await this.createEmbeddedDocuments("Item", startingAbiligites);
        break;
    }
  }

  /** @inheritdoc */
  async _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    if(data.system?.hearts && this.system.hearts.total < this.system.hearts.value) {
      this.update({"system.hearts.value": this.system.hearts.total})
    }
    if(data.system?.history) {
      this.update({"system.purviews": data.system?.history.system.purviews.join("\n")});
    }
  }

}
