import { BreakItemSheet } from "./item-sheet.js";

export class BreakAreaConditionSheet extends BreakItemSheet {
  static DEFAULT_OPTIONS = {
    ...this.DEFAULT_OPTIONS,
    tag: "form",
    classes: ["break", "sheet", "area-condition"],
    position: {
      width: 600,
      height: 480
    },
    form: {
      handler: BreakAreaConditionSheet.#onSubmit,
      submitOnChange: true
    },
    window: {
      resizable: true
    },
    actions: {
      editImage: BreakItemSheet.onEditImage,
      addEffect: BreakItemSheet.onAddEffect,
      displayEffect: BreakItemSheet.onDisplayEffect
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
      template: "systems/break/templates/items/area-condition/area-condition-description-tab.hbs"
    },
    effects: {
      template: "systems/break/templates/items/area-condition/area-condition-effects-tab.hbs"
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
    return context;
  }

  static async #onSubmit(event, form, formData) {
    event.preventDefault();
    const updateData = this.getSubmitData(formData);
    await this.item.update(updateData);
  }
}
