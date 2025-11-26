import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";
import { BreakItemSheet } from "./item-sheet.js";

export class BreakShieldSheet extends BreakItemSheet {
  allowedItemTypes = ["ability"];
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
      template: "systems/break/templates/items/shield/shield-description-tab.hbs"
    },
    properties: {
      template: "systems/break/templates/items/shield/shield-properties-tab.hbs"
    },
    effects: {
      template: "systems/break/templates/items/shield/shield-effects-tab.hbs"
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
    context.isShield = true;
    context.requiresType = true;
    context.abilities = await Promise.all((context.document.system.abilities ?? []).map(async uuid => (await fromUuid(uuid))));
    const shieldTypes = foundry.utils.deepClone(game.settings.get("break", "shieldTypes"));
    context.itemTypes = Object.keys(shieldTypes).map(k => ({
      key: k,
      label: shieldTypes[k].label,
      active: context.document.system.type === k
    }));
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
        filters.push(a => a.system.type === "shield" && !this.document.system.abilities.includes(a.uuid));
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
      updateData.system.typeLabel = shieldTypes[newType].label;
    }
    await this.item.update(updateData);
  }
  //#endregion
}
