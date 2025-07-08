import BREAK from "../constants.js";
import { BreakItemSheet } from "./item-sheet.js";

export class BreakGiftSheet extends BreakItemSheet {

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "gift"],
    position: {
      width: 520,
      height: 480,
    },
    form: {
      handler: BreakGiftSheet.#onSubmit,
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
      template: "systems/break/templates/items/gift/gift-sheet.hbs"
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.abilityTypes = BREAK.ability_types;
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
