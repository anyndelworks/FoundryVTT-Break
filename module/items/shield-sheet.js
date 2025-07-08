import { BreakItemSheet } from "./item-sheet.js";

export class BreakShieldSheet extends BreakItemSheet {

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "shield"],
    position: {
      width: 600,
      height: 480,
    },
    form: {
      handler: BreakShieldSheet.#onSubmit,
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
      template: "systems/break/templates/items/shield/shield-sheet.hbs"
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.isShield = true;
    context.requiresType = true;
    context.abilities = context.document.system.abilities ?? [];
    const shieldTypes = foundry.utils.deepClone(game.settings.get("break", "shieldTypes"));
    context.itemTypes = Object.keys(shieldTypes).map(k => ({
      key: k,
      label: shieldTypes[k].label,
      active: context.document.system.type === k
    }));
    return context;
  }
  //#endregion

  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if(data.type !== "Item") return;
    const draggedItem = await fromUuid(data.uuid)
    if(draggedItem.type === "ability" && draggedItem.system.subtype === "shield") {
      const abilityArray = this.item.system.abilities ?? [];
      abilityArray.push(draggedItem.toObject());
      this.item.update({"system.abilities": abilityArray});
    }
  }

  //#region DocumentV2 submit
  static async #onSubmit(event, form, formData) {
    event.preventDefault();
    const updateData = foundry.utils.expandObject(formData.object);
    if(updateData.system.type !== this.item.system.type) {
      const currentType = this.item.system.type;
      const newType = updateData.system.type;
      const shieldTypes = foundry.utils.deepClone(game.settings.get("break", "shieldTypes"));
      if(this.item.system.defenseBonus === shieldTypes[currentType].defense) {
        updateData.system.defenseBonus = shieldTypes[newType].defense;
      }
      if(this.item.system.slots === shieldTypes[currentType].slots) {
        updateData.system.slots = shieldTypes[newType].slots;
      }
      if(this.item.system.speedPenalty === shieldTypes[currentType].speedPenalty) {
        updateData.system.speedPenalty = shieldTypes[newType].speedPenalty;
      }
      if(this.item.system.hands === shieldTypes[currentType].hands) {
        updateData.system.hands = shieldTypes[newType].hands;
      }
      if(this.item.system.value.gems === shieldTypes[currentType].value.gems
        && this.item.system.value.coins === shieldTypes[currentType].value.coins
        && this.item.system.value.stones === shieldTypes[currentType].value.stones
      ) {
        updateData.system.value = shieldTypes[newType].value;
      }
    }
    await this.item.update(updateData);
  }
  //#endregion
}
