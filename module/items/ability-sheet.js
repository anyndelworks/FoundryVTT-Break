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
          addAction: this.onAddAction
      }
  }

  static PARTS = {
      header: {
        template: "systems/break/templates/items/shared/generic-header.hbs"
      },
      tabs: {
        template: "systems/break/templates/shared/sheet-tabs.hbs",
      },
      description: {
        template: "systems/break/templates/items/ability/ability-description-tab.hbs"
      },
      effects: {
        template: "systems/break/templates/items/ability/ability-effects-tab.hbs"
      }
  }

  static TABS = {
    primary: {
      initial: "description",
      tabs: [{id: "description", icon: "fas fa-scroll"}, {id: "effects", icon: "fas fa-sparkles"}],
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.rulesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.rules, {
      secrets: this.document.isOwner,
      async: true
    });
    console.log(context.document)
    context.requiresType = true;
    context.itemTypes = Object.keys(BREAK.ability_types).map(k => ({
      key: k,
      label: game.i18n.localize(BREAK.ability_types[k]),
      active: context.document.system.type === k
    }));
    context.requiresSubtype = context.document.system.type === 'calling';
    context.itemSubtypes = Object.keys(BREAK.ability_levels).map(k => ({
      key: k,
      label: game.i18n.localize(BREAK.ability_levels[k]),
      active: context.document.system.subtype === k
    }));
    context.isMagic = context.document.system.magic ?? false;
    context.isAbility = true;
    console.log(context.isMagic);
    return context;
  }
  //#endregion

  //#region DocumentV2 submit
  static async #onSubmit(event, form, formData) {
    console.log(formData);
      event.preventDefault();
      const updateData = this.getSubmitData(formData)
      await this.item.update(updateData);
  }
  //#endregion
}
