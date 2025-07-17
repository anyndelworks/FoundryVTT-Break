import { BreakItemSheet } from "./item-sheet.js";

export class BreakWeaponSheet extends BreakItemSheet {

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "item", "weapon"],
    position: {
      width: 600,
      height: 480,
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
      addAction: this.onAddAction
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

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
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
    context.abilities = context.document.system.abilities ?? [];
    return context;
  }
  //#endregion

  /** @inheritdoc */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if(data.type !== "Item") return;
    const draggedItem = await fromUuid(data.uuid)
    if(draggedItem.type === "ability" && draggedItem.system.subtype === "weapon") {
      const abilityArray = this.item.system.abilities ?? [];
      abilityArray.push(draggedItem.toObject());
      this.item.update({"system.abilities": abilityArray});
    }
  }

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
    return updates;
  }

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
  