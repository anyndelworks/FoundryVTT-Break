import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";
import { BreakItemSheet } from "./item-sheet.js";

export class BreakArmorSheet extends BreakItemSheet {
  allowedItemTypes = ["ability"];
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
      selectFeature: this.onSelectFeature,
      addEffect: this.onAddEffect,
      displayEffect: this.onDisplayEffect
    }
  }

  static PARTS = {
    header: {
      template: "systems/break/templates/items/shared/item-header.hbs"
    },
    tabs: {
      template: "systems/break/templates/shared/sheet-tabs.hbs",
    },
    description: {
      template: "systems/break/templates/items/armor/armor-description-tab.hbs"
    },
    properties: {
      template: "systems/break/templates/items/armor/armor-properties-tab.hbs"
    },
    effects: {
      template: "systems/break/templates/items/armor/armor-effects-tab.hbs"
    }
  }

  static TABS = {
    primary: {
      initial: "description",
      tabs: [{id: "description", icon: "fas fa-scroll"}, {id: "properties", icon: "fas fa-sword"}, {id: "effects", icon: "fas fa-sparkles"}],
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
    context.abilities = await Promise.all((context.document.system.abilities ?? []).map(async uuid => (await fromUuid(uuid))));
    return context;
  }
  //#endregion

  _onDropValidItem(item) {
    this.addAbility(item);
  }

  static async onSelectFeature(event) {
    event.preventDefault();
    const featureType = event.target.dataset.type;
    let predefinedList = null;
    let filters = [];
    let callback = () => {};
    switch(featureType){
      case "ability":
        filters.push(a => a.system.type === "armor" && !this.document.system.abilities.includes(a.uuid));
        callback = (picks) => {
          this.addAbilities(picks);
        }
        break;
    }
    new FeatureSelectionDialog({
      itemType: featureType,
      document: this.document,
      predefinedList,
      filters,
      callback
    }).render(true);
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
      if(this.item.system.value.gems === armorTypes[currentType].value.gems
        && this.item.system.value.coins === armorTypes[currentType].value.coins
        && this.item.system.value.stones === armorTypes[currentType].value.stones
      ) {
        updateData.system.value = armorTypes[newType].value;
      }
      updateData.system.typeLabel = armorTypes[newType].label;
    }
    await this.item.update(updateData);
  }
  //#endregion
}
