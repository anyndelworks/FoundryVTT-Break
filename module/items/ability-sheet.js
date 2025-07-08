import BREAK from "../constants.js";
import { BreakItemSheet } from "./item-sheet.js";

export class BreakAbilitySheet extends BreakItemSheet {

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
      ...this.DEFAULT_OPTIONS,
      tag: "form",
      classes: ["break", "sheet", "ability"],
      position: {
          width: 600,
          height: 480,
      },
      form: {
          handler: BreakAbilitySheet.#onSubmit,
          submitOnChange: true
      },
      window: {
          resizable: true
      },
      actions: {
          editImage: this.onEditImage,
      }
  }

  static PARTS = {
      header: {
          template: "systems/break/templates/items/shared/generic-header.hbs"
      },
      body: {
          template: "systems/break/templates/items/ability/ability-sheet.hbs"
      }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.abilityTypes = Object.keys(BREAK.ability_types).map(k => ({
      key: k,
      label: game.i18n.localize(BREAK.ability_types[k]),
      active: context.document.system.subtype === k
    }));
    context.abilityLevels = Object.keys(BREAK.ability_levels).map(k => ({
      key: k,
      label: game.i18n.localize(BREAK.ability_levels[k]),
      active: context.document.system.level === k
    }));
    console.log(context);
    return context;
  }
  //#endregion

  //#region DocumentV2 submit
  static async #onSubmit(event, form, formData) {
      event.preventDefault();
      const updateData = foundry.utils.expandObject(formData.object);
      await this.item.update(updateData);
  }
  //#endregion
}
