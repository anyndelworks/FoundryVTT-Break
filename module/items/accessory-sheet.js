import { BreakItemSheet } from "./item-sheet.js";

export class BreakAccessorySheet extends BreakItemSheet {

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "accesory"],
    position: {
      width: 600,
      height: 480,
    },
    form: {
      handler: BreakAccessorySheet.#onSubmit,
      submitOnChange: true
    },
    window: {
      resizable: true
    },
    actions: {
      deleteAbility: this.onDeleteAbility,
      editImage: this.onEditImage,
    }
  }

  static PARTS = {
    header: {
      template: "systems/break/templates/items/shared/item-header.hbs"
    },
    body: {
      template: "systems/break/templates/items/accessory/accessory-sheet.hbs"
    }
  }

  async _prepareContext(options) {
    console.log('test')
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.isAccessory = true;
    return context;
  }
  //#endregion

  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data.type !== "Item") return;
  }

  //#region DocumentV2 submit
  static async #onSubmit(event, form, formData) {
    event.preventDefault();
    const updateData = foundry.utils.expandObject(formData.object);
    await this.item.update(updateData);
  }
  //#endregion
}
