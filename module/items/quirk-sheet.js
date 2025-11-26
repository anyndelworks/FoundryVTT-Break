import { BreakItemSheet } from "./item-sheet.js";
import BREAK from "../constants.js";

export class BreakQuirkSheet extends BreakItemSheet {
  //#region DocumentV2 initialization and setup
    static DEFAULT_OPTIONS = {
      ...this.DEFAULT_OPTIONS,
      tag: "form",
      classes: ["break", "sheet", "quirk"],
      position: {
          width: 600,
          height: 550,
      },
      form: {
          handler: BreakQuirkSheet.#onSubmit,
          submitOnChange: true
      },
      window: {
          resizable: true
      },
      actions: {
        editImage: this.onEditImage,
        addEffect: this.onAddEffect,
        displayEffect: this.onDisplayEffect
      }
  }

  static PARTS = {
      header: {
        template: "systems/break/templates/items/shared/generic-header.hbs"
      },
      tabs: {
        template: "systems/break/templates/shared/sheet-tabs.hbs",
      },
      effects: {
        template: "systems/break/templates/items/quirk/quirk-effects-tab.hbs"
      },
      description: {
        template: "systems/break/templates/items/quirk/quirk-description-tab.hbs"
      }
  }

  static TABS = {
    primary: {
      initial: "description",
      tabs: [{id: "description", icon: "fas fa-scroll"}, {id: "effects", icon: "fas fa-sparkles"}],
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.advantagesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.advantages, {
      secrets: this.document.isOwner,
      async: true
    });
    context.disadvantagesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.disadvantages, {
      secrets: this.document.isOwner,
      async: true
    });

    context.requiresType = true;
    context.itemTypes = Object.keys(BREAK.quirk_categories).map(k => ({
      key: k,
      label: game.i18n.localize(BREAK.quirk_categories[k]),
      active: context.document.system.type === k
    }));
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
