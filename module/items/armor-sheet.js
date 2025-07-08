import { BreakItemSheet } from "./item-sheet.js";

export class BreakArmorSheet extends BreakItemSheet {

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "armor"],
    position: {
      width: 600,
      height: 480,
    },
    form: {
      handler: BreakArmorSheet.#onSubmit,
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
      template: "systems/break/templates/items/armor/armor-sheet.hbs"
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.isArmor = true;
    context.requiresType = true;
    context.abilities = context.document.system.abilities ?? [];
    const armorTypes = foundry.utils.deepClone(game.settings.get("break", "armorTypes"));
    context.itemTypes = Object.keys(armorTypes).map(k => ({
      key: k,
      label: armorTypes[k].label,
      active: context.document.system.type === k
    }));
    return context;
  }
  //#endregion

  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if(data.type !== "Item") return;
    const draggedItem = await fromUuid(data.uuid)
    if(draggedItem.type === "ability" && draggedItem.system.subtype === "armor") {
      const abilityArray = this.item.system.abilities ?? [];
      abilityArray.push(draggedItem.toObject());
      this.item.update({"system.abilities": abilityArray});
    }
  }

  //#region DocumentV2 submit
  static async #onSubmit(event, form, formData) {
    event.preventDefault();
    const updateData = foundry.utils.expandObject(formData.object);
    updateData.system.speedLimit = Number(updateData.system.speedLimit);
    if(updateData.system.type !== this.item.system.type) {
      const currentType = this.item.system.type;
      const newType = updateData.system.type;
      const armorTypes = foundry.utils.deepClone(game.settings.get("break", "armorTypes"));
      if(this.item.system.defenseBonus === armorTypes[currentType].defense) {
        updateData.system.defenseBonus = armorTypes[newType].defense;
      }
      if(this.item.system.slots === armorTypes[currentType].slots) {
        updateData.system.slots = armorTypes[newType].slots;
      }
      if(this.item.system.speedLimit === armorTypes[currentType].speedLimit) {
        updateData.system.speedLimit = armorTypes[newType].speedLimit;
      }
      console.log(this.item.system.value);
      console.log(armorTypes[currentType].value)
      if(this.item.system.value.gems === armorTypes[currentType].value.gems
        && this.item.system.value.coins === armorTypes[currentType].value.coins
        && this.item.system.value.stones === armorTypes[currentType].value.stones
      ) {
        updateData.system.value = armorTypes[newType].value;
      }
    }
    await this.item.update(updateData);
  }
  //#endregion
}
