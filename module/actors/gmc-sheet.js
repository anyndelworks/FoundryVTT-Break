import { BreakActorSheet } from "./actor-sheet.js";

export class BreakGMCSheet extends BreakActorSheet {
  _viewOnly = true;

  static DEFAULT_OPTIONS = {
    classes: ["break", "sheet", "actor", "gmc"],
    position: {
      width: 600,
      height: 600
    },
    actions: {
      toggleEditable: this.#onToggleEditable
    }
  };

  static PARTS = {
    header: {
      template: "systems/break/templates/actors/gmc/parts/sheet-header.hbs"
    },
    notes: {
      template: "systems/break/templates/actors/gmc/parts/sheet-notes.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      context.document.system.description,
      {
        secrets: this.document.isOwner,
        async: true
      }
    );
    context.editable = this.isEditable && !this._viewOnly;
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._toggleSheetControls(!context.editable);
  }

  static #onToggleEditable(event) {
    event.preventDefault();
    this._viewOnly = !this._viewOnly;
    this.render(true);
  }
}
