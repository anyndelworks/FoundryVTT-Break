import { BreakItemSheet } from "./item-sheet.js";

export class BreakAilmentSheet extends BreakItemSheet {

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
      ...this.DEFAULT_OPTIONS,
      tag: "form",
      classes: ["break", "sheet", "injury"],
      position: {
          width: 600,
          height: 480,
      },
      form: {
          handler: BreakAilmentSheet.#onSubmit,
          submitOnChange: true
      },
      window: {
          resizable: true
      },
      actions: {
        editImage: this.onEditImage,
        linkEffect: this.#onLinkEffect,
        addEffect: this.onAddEffect,
        displayEffect: this.onDisplayEffect
      }
  }

  static PARTS = {
      header: {
          template: "systems/break/templates/items/shared/generic-header.hbs"
      },
      body: {
          template: "systems/break/templates/items/ailment/ailment-sheet.hbs"
      }
  }

  async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
        secrets: this.document.isOwner,
        async: true
      });
      return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
  }
  //#endregion

  //#region Actions
  static async #onLinkEffect(event) {
    event.preventDefault();
    const button = event.target.closest("[data-id]");
    const id = button.dataset.id;
    const effect = this.document.effects.get(id);
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
