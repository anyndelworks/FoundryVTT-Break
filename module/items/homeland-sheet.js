import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";
import { BreakItemSheet } from "./item-sheet.js";

export class BreakHomelandSheet extends BreakItemSheet {
  allowedItemTypes = ["history"];
  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "homeland"],
    position: {
      width: 600,
      height: 480,
    },
    form: {
      handler: BreakHomelandSheet.#onSubmit,
      submitOnChange: true
    },
    window: {
      resizable: true
    },
    actions: {
      editImage: this.onEditImage,
      deleteHistory: this.#onDeleteHistory,
      selectFeature: this.onSelectFeature
    }
  }

  static PARTS = {
    header: {
      template: "systems/break/templates/items/shared/generic-header.hbs"
    },
    body: {
      template: "systems/break/templates/items/homeland/homeland-sheet.hbs"
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.bonusLanguages = context.document.system.bonusLanguages;
    context.histories = await Promise.all(context.document.system.histories.map(async (id) => await fromUuid(id))) ?? [];
    return context;
  }

  async _onAddHistory(uuid) {
    const histories = [...this.item.system.histories];
    if(!histories.includes(uuid)) {
        histories.push(uuid);
        this.item.update({"system.histories": histories});
    }
  }
  //#endregion

  //#region Actions
  static async #onDeleteHistory(event) {
    event.preventDefault();
    const button = event.target;
    const id = button.dataset.id;

    if(id) {
      const histories = this.item.system.histories.filter(uuid => {
          const split = uuid.split(".");
          return split[split.length-1] !== id;
      });
      this.item.update({"system.histories": histories});
    }
  }
  static onSelectFeature(event) {
    event.preventDefault();
    const featureType = event.target.dataset.type;
    new FeatureSelectionDialog({
        allowedTypes: this.allowedItemTypes,
        itemType: featureType,
        document: this.document,
        predefinedList: null,
        filters: [(i) => !this.item.system.histories.includes(i.uuid)],
        callback: picks => this._onAddHistory(picks[0].uuid)
    }).render(true);
  }
  //#endregion

  //#region Events
  _onDropValidItem(item) {
    this._onAddHistory(item.uuid);
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
