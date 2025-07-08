import { BreakItemSheet } from "./item-sheet.js";

export class BreakSpeciesSheet extends BreakItemSheet {
  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
      ...this.DEFAULT_OPTIONS,
      tag: "form",
      classes: ["break", "sheet", "species"],
      position: {
        width: 600,
        height: 480,
      },
      form: {
        handler: BreakSpeciesSheet.#onSubmit,
        submitOnChange: true
      },
      window: {
        resizable: true
      },
      actions: {
        editImage: this.onEditImage,
        deleteInnateAbility: this.#onDeleteInnateAbility,
        deleteMaturativeAbility: this.#onDeleteMaturativeAbility
      }
  }

  static PARTS = {
      header: {
          template: "systems/break/templates/items/shared/generic-header.hbs"
      },
      body: {
          template: "systems/break/templates/items/species/species-sheet.hbs"
      }
  }

  async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
          secrets: this.document.isOwner,
          async: true
      });

      context.innateAbilities = this.item.system.innateAbilities ?? [];
      context.hasInnateAbilities = context.innateAbilities.length > 0;
      context.maturativeAbility = this.item.system.maturativeAbility;

      const sizes = foundry.utils.deepClone(game.settings.get("break", "sizes"));
      context.sizes = Object.keys(sizes).map(k => ({
        key: k,
        label: sizes[k].label,
        active: context.document.system.size === k
      }));
      return context;
  }
  //#endregion

  //#region Actions
  static async #onDeleteInnateAbility(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.id.split('-')[1], 10);
    this.item.system.innateAbilities.splice(index, 1);
    this.item.update({"system.innateAbilities": this.item.system.innateAbilities});
  }

  static async #onDeleteMaturativeAbility(event) {
    event.preventDefault();
    this.item.update({"system.maturativeAbility": null});
  }
  //#endregion
  
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if(data.type !== "Item") return;
    const draggedItem = await fromUuid(data.uuid);

    if(draggedItem.type === "ability") {
      if(event.target.id === "innateAbilities") {
        const ia = this.item.system.innateAbilities ?? [];
        ia.push(draggedItem.toObject());
        this.item.update({"system.innateAbilities": ia});
      } else if (event.target.id === "maturativeAbility") {
        this.item.update({"system.maturativeAbility": draggedItem.toObject()})
      }
    }
  }

  //#region DocumentV2 submit
  static async #onSubmit(event, form, formData) {
      event.preventDefault();
      const updateData = foundry.utils.expandObject(formData.object);
      await this.item.update(updateData);
  }
  //#endregion
}
