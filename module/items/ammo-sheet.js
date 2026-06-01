import BREAK from "../constants.js";
import { BreakItemSheet } from "./item-sheet.js";

export class BreakAmmoSheet extends BreakItemSheet {

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "ammo"],
    position: {
      width: 600,
      height: 500,
    },
    form: {
      handler: BreakAmmoSheet.#onSubmit,
      submitOnChange: true
    },
    window: {
      resizable: true
    },
    actions: {
      toggleEditable: this.onToggleEditable,
      editImage: this.onEditImage,
      addEffect: this.onAddEffect,
      displayEffect: this.onDisplayEffect
    }
  }

  static PARTS = {
    header: {
      template: "systems/break/templates/items/shared/item-header.hbs"
    },
    tabs: {
      template: "systems/break/templates/shared/sheet-tabs.hbs",
    },
    properties: {
      template: "systems/break/templates/items/ammo/ammo-properties-tab.hbs"
    },
    effects: {
      template: "systems/break/templates/items/ammo/ammo-effects-tab.hbs"
    }
  }

  static TABS = {
    primary: {
      initial: "properties",
      tabs: [{id: "properties", icon: "fas fa-bullseye"}, {id: "effects", icon: "fas fa-sparkles"}],
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.isAmmo = true;
    const weaponTypes = foundry.utils.deepClone(game.settings.get("break", "weaponTypes"));
    context.itemTypes = Object.keys(weaponTypes).filter(k => weaponTypes[k].ranged).map(k => ({
      key: k,
      label: weaponTypes[k].label,
      active: context.document.system.weaponType === k
    }));
    context.aptitudes = Object.keys(BREAK.aptitudes).map(k => ({
      key: k,
      label: game.i18n.localize(BREAK.aptitudes[k].label),
      active: context.document.system.check?.aptitude === k
    }));
    context.targetModes = Object.keys(BREAK.ammo_target_modes).map(k => ({
      key: k,
      label: game.i18n.localize(BREAK.ammo_target_modes[k].label),
      active: context.document.system.targetMode === k
    }));
    context.attackModifiers = Object.keys(BREAK.ammo_attack_modifiers).map(k => ({
      ...BREAK.ammo_attack_modifiers[k],
      label: game.i18n.localize(BREAK.ammo_attack_modifiers[k].label),
      active: context.document.system.attackModifier === BREAK.ammo_attack_modifiers[k].key
    }));
    context.checkModifiers = Object.keys(BREAK.ammo_attack_modifiers).map(k => ({
      ...BREAK.ammo_attack_modifiers[k],
      label: game.i18n.localize(BREAK.ammo_attack_modifiers[k].label),
      active: context.document.system.check?.modifier === BREAK.ammo_attack_modifiers[k].key
    }));
    return context;
  }
  //#endregion

  //#region DocumentV2 submit
  static async #onSubmit(event, form, formData) {
    event.preventDefault();
    const updateData = this.getSubmitData(formData);
    updateData.system.special = !!updateData.system.special;
    updateData.system.check = updateData.system.check ?? {};
    updateData.system.check.enabled = !!updateData.system.check.enabled;
    await this.item.update(updateData);
  }
  //#endregion
}
