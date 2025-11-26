import { BreakItemSheet } from "./item-sheet.js";
import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";

export class BreakWeaponSheet extends BreakItemSheet {
  allowedItemTypes = ["ability"];
  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "item", "weapon"],
    position: {
      width: 600,
      height: 520,
    },
    form: {
      handler: BreakWeaponSheet.#onSubmit,
      submitOnChange: true
    },
    window: {
      resizable: true
    },
    actions: {
      editImage: this.onEditImage,
      addEffect: this.onAddEffect,
      addAction: this.onAddAction,
      displayAction: this.onDisplayAction,
      selectFeature: this.onSelectFeature
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
      template: "systems/break/templates/items/weapon/weapon-description-tab.hbs"
    },
    properties: {
      template: "systems/break/templates/items/weapon/weapon-properties-tab.hbs"
    },
    effects: {
      template: "systems/break/templates/items/weapon/weapon-effects-tab.hbs"
    }
  }

  static TABS = {
    primary: {
      initial: "description",
      tabs: [{id: "description", icon: "fas fa-scroll"}, {id: "properties", icon: "fas fa-sword"}, {id: "effects", icon: "fas fa-sparkles"}],
    }
  }

  async #getAbilities(context) {
    context.abilities = []
    for(let id of this.document.system.abilities) {
      const ability = await fromUuid(id);
      context.abilities.push(ability);
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    console.log(context.document)
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.isWeapon = true;
    const weaponTypes = foundry.utils.deepClone(game.settings.get("break", "weaponTypes"));
    context.itemTypes = Object.keys(weaponTypes).map(k => ({
      key: k,
      label: weaponTypes[k].label,
      active1: context.document.system.weaponType1 === k,
      active2: context.document.system.weaponType2 === k
    }));
    const weaponType1Ranged = weaponTypes[context.document.system.weaponType1]?.ranged;
    const weaponType2Ranged = weaponTypes[context.document.system.weaponType2]?.ranged;
    context.isRanged = weaponType1Ranged || weaponType2Ranged;
    context.isMelee = (context.document.system.weaponType1 && !weaponType1Ranged) || (context.document.system.weaponType2 && !weaponType2Ranged);
    await this.#getAbilities(context);
    return context;
  }
  //#endregion

  _onSetWeaponType(newMainType, newSecondaryType) {
    const weaponTypes = foundry.utils.deepClone(game.settings.get("break", "weaponTypes"));

    const updates = {};
    let lowerExtraDamage = 0;
    let lowerRangedExtraDamage = 0;
    let higherSlots = 0;
    let itemValue = 0;
    let higherRange = 0;
    let lowerLoadingTime = 0;
    let ranged = false;
    let melee = false;

    const checkValues = (type) => {
      if(type) {
        if (type.ranged) {
          if (type.extraDamage < lowerRangedExtraDamage || lowerRangedExtraDamage == 0)
            lowerRangedExtraDamage = type.extraDamage
          if (type.range > higherRange)
            higherRange = type.range
          if (type.loadingTime < lowerLoadingTime || lowerLoadingTime == 0)
            lowerLoadingTime = type.loadingTime
          ranged = true;
        }
        else {
          if (type.extraDamage < lowerExtraDamage || lowerExtraDamage == 0)
            lowerExtraDamage = type.extraDamage
          melee = true;
        }
        if(type.slots > higherSlots) {
          higherSlots = type.slots;
        }
        if(type.value) {
          itemValue += type.value.stones;
          itemValue += type.value.coins*10;
          itemValue += type.value.gems*1000;  
        }
      }
    }
    if(newMainType)
      checkValues(weaponTypes[newMainType]);
    if(newSecondaryType)
      checkValues(weaponTypes[newSecondaryType]);    
    if(newMainType && newSecondaryType)
      itemValue *= 2;
    updates["system.extraDamage"] = lowerExtraDamage;
    updates["system.rangedExtraDamage"] = lowerRangedExtraDamage;
    updates["system.slots"] = higherSlots;
    updates["system.loadingTime"] = lowerLoadingTime;
    updates["system.range"] = higherRange;
    updates["system.ranged"] = ranged;
    updates["system.melee"] = melee;
    const gems = Math.floor(itemValue/1000);
    const coins = Math.floor((itemValue-gems*1000)/10);
    const stones = itemValue-(gems*1000)-(coins*10);
    updates["system.value"] = {
      gems,
      coins,
      stones
    }
    updates["system.typeLabel"] = `${newMainType ? weaponTypes[newMainType].label : ""} ${newSecondaryType ? weaponTypes[newSecondaryType].label : ""}`
    return updates;
  }

  async _onSendAbilityToChat(element) {
    const id = element.dataset.id;
    const ability = await fromUuid(id);
    if(ability)
      ability.sendToChat();
  }

  async _onDeleteAbility(element) {
    const id = element.dataset.id;
    let abilities = this.document.system.abilities ?? [];
    abilities = abilities.filter(a => a !== id);
    this.document.update({"system.abilities": abilities});
  }

  //#region Actions
  static async onSelectFeature(event) {
    event.preventDefault();
    const featureType = event.target.dataset.type;
    let predefinedList = null;
    let filters = [];
    let callback = () => {};
    switch(featureType){
      case "ability":
        filters.push(a => a.system.type === "weapon" && !this.document.system.abilities.includes(a.uuid));
        callback = (picks) => {
          const abilities = [...this.document.system.abilities];
          abilities.push(picks[0].uuid);
          this.document.update({"system.abilities": abilities});
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
  //#endregion

  //#region Events
  _onDropValidItem(item) {
    const abilities = this.item.system.abilities ?? [];
    if(!abilities.includes(item.uuid)) {
        abilities.push(item.uuid);
        this.item.update({"system.abilities": abilities});
    }
  }
  //#endregion

  //#region DocumentV2 submit
    static async #onSubmit(event, form, formData) {
      event.preventDefault();
      let updateData = this.getSubmitData(formData);

      if(updateData.system.weaponType1 !== this.item.system.weaponType1 || updateData.system.weaponType2 !== this.item.system.weaponType2) {
        const updates = this._onSetWeaponType(updateData.system.weaponType1, updateData.system.weaponType2);
        updateData = {...updateData, ...updates};
      }
      await this.item.update(updateData);
    }
  //#endregion
}
  