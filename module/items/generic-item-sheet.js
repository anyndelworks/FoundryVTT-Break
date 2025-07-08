import { BreakItemSheet } from "./item-sheet.js";
import BREAK from "../constants.js";

export class BreakGenericItemSheet extends BreakItemSheet {

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "generic-item"],
    position: {
      width: 600,
      height: 480,
    },
    form: {
      handler: BreakGenericItemSheet.#onSubmit,
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
      template: "systems/break/templates/items/shared/item-header.hbs"
    },
    body: {
      template: "systems/break/templates/items/item/generic-item-sheet.hbs"
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    console.log(BREAK.item_types)
    context.itemTypes = Object.keys(BREAK.item_types).map(k => ({
        key: k,
        label: game.i18n.localize(BREAK.item_types[k]),
        active: context.document.system.type === k
    }));
    context.requiresType = true;
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
