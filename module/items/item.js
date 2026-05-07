import BREAK from "../constants.js";

/**
 * Extend the base Item document to support aptitudes and groups with a custom template creation dialog.
 * @extends {Item}
 */
export class BreakItem extends Item {

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
  }

  async onDeleteAttachedItem(id) {
    const item = this.items.find(i => i._id == id);
    if(item) {
      item.delete();
    }
    return this;
  }

  mergeAndPruneAbilities(newAbilities) {
    let abilityArray = this.system.abilities ?? [];
    abilityArray = abilityArray.concat(newAbilities);
    const prunedAbilities = [];
    abilityArray.reduce((pa, a) => {
      if(!pa.some(i => a._id === i._id))
        pa.push(a);
      return pa;
    }, prunedAbilities);
    return prunedAbilities;
  }

  async deleteEffect(id) {
    const effect = this.effects.find(i => i._id == id);
    if(effect) {
      effect.delete()
    }
    return this
  }

  async sendToChat() {
    const itemData = foundry.utils.duplicate(this.system);
    itemData.name = this.name;
    itemData.itemType = this.type;
    itemData.img = this.img;
    itemData.isWeapon = this.type === "weapon";
    itemData.isArmor = this.type === "armor";
    itemData.isArmor = this.type === "armor";
    itemData.isAbility = this.type === "ability";
    itemData.isQuirk = this.type === "quirk";
    itemData.isGift = this.type === "gift";
    itemData.isAmmo = this.type === "ammo";
    itemData.isRanged = this.system.ranged;
    itemData.isMelee = this.system.melee;
    itemData.isGear = this.type != "quirk" && this.type != "ability" && this.type != "calling" && this.type != "gift";
    if(itemData.isAmmo && this.system.weaponType) {
      itemData.weaponTypeLabel = game.settings.get("break", "weaponTypes")[this.system.weaponType]?.label;
    }
    if(itemData.isAmmo && this.system.attackModifier) {
      itemData.attackModifierLabel = game.i18n.localize(BREAK.ammo_attack_modifiers[this.system.attackModifier]?.label);
    }
    if(itemData.isAmmo && this.system.check?.aptitude) {
      itemData.checkAptitudeLabel = game.i18n.localize(BREAK.aptitudes[this.system.check.aptitude]?.label);
    }
    if(itemData.isAmmo && this.system.check?.modifier) {
      itemData.checkModifierLabel = game.i18n.localize(BREAK.ammo_attack_modifiers[this.system.check.modifier]?.label);
    }
    const html = await foundry.applications.handlebars.renderTemplate("systems/break/templates/chat/item.html", itemData);
    const chatData = {
      user: game.user.id,
      rollMode: game.settings.get("core", "rollMode"),
      content: html,
    }

    if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
      chatData.whisper = ChatMessage.getWhisperRecipients("GM");
    } else if (chatData.rollMode === "selfroll") {
      chatData.whisper = [game.user];
    }
    ChatMessage.create(chatData);
  }
}
