import { BreakItemSheet } from "./item-sheet.js";

export class BreakOutfitSheet extends BreakItemSheet {

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "outfit"],
    position: {
      width: 600,
      height: 480,
    },
    form: {
      handler: BreakOutfitSheet.#onSubmit,
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
      template: "systems/break/templates/items/outfit/outfit-sheet.hbs"
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.isOutfit = true;
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
