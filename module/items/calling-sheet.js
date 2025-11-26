import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";
import { BreakItemSheet } from "./item-sheet.js";

export class BreakCallingSheet extends BreakItemSheet {
  allowedItemTypes = ["ability"];
  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "calling"],
    position: {
      width: 600,
      height: 650,
    },
    form: {
      handler: BreakCallingSheet.#onSubmit,
      submitOnChange: true
    },
    window: {
      resizable: true
    },
    actions: {
      editImage: this.onEditImage,
      addAdvancementRank: this.#addAdvancementRank,
      removeAdvancementRank: this.#removeAdvancementRank,
      removeAllowance: this.#removeAllowance,
      selectFeature: this.onSelectFeature
    }
  }

  static TABS = {
    primary: {
      initial: "description",
      tabs: [{id:"description", icon: "fas fa-scroll"}, {id:"details", icon: "fas fa-swords"}, {id: "advancement", icon: "fas fa-book-sparkles"}],
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
      template: "systems/break/templates/items/calling/parts/sheet-tab-description.hbs"
    },
    details: {
      template: "systems/break/templates/items/calling/parts/sheet-tab-details.hbs"
    },
    advancement: {
      template: "systems/break/templates/items/calling/parts/sheet-tab-advancement.hbs"
    }
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
        secrets: this.document.isOwner,
        async: true
    });
    context.advancementTable = context.document.system.advancementTable ?? [];

    context.startingAbilities = context.document.system.startingAbilities ?? [];
    context.hasStartingAbilities = context.startingAbilities.length > 0;
    context.electiveAbilities = context.document.system.abilities ?? [];
    context.hasElectiveAbilities = context.electiveAbilities.length > 0;

    context.armorAllowances = context.document.system.armorAllowances ?? [];
    context.weaponAllowances = context.document.system.weaponAllowances ?? [];
    context.shieldAllowances = context.document.system.shieldAllowances ?? [];

    const weaponTypes = foundry.utils.deepClone(game.settings.get("break", "weaponTypes"));
    context.weaponTypes = Object.keys(weaponTypes).map(k => ({
      key: k,
      label: weaponTypes[k].label,
      disabled: context.weaponAllowances.includes(k)
    }));
    context.weaponAllowances = Object.keys(weaponTypes).filter(k => context.weaponAllowances.includes(k)).map(k => ({...weaponTypes[k], key: k}));
    const armorTypes = foundry.utils.deepClone(game.settings.get("break", "armorTypes"));
    context.armorTypes = Object.keys(armorTypes).map(k => ({
      key: k,
      label: armorTypes[k].label,
      disabled: context.armorAllowances.includes(k)
    }));
    context.armorAllowances = Object.keys(armorTypes).filter(k => context.armorAllowances.includes(k)).map(k => ({...armorTypes[k], key: k}));
    const shieldTypes = foundry.utils.deepClone(game.settings.get("break", "shieldTypes"));
    context.shieldTypes = Object.keys(shieldTypes).map(k => ({
      key: k,
      label: shieldTypes[k].label,
      disabled: context.shieldAllowances.includes(k)
    }));
    context.shieldAllowances = Object.keys(shieldTypes).filter(k => context.shieldAllowances.includes(k)).map(k => ({...shieldTypes[k], key: k}));

    const abilityList = await Promise.all((context.document.system.abilities ?? []).map(async uuid => (await fromUuid(uuid))));
    context.startingAbilities = abilityList.filter(a => a?.system.subtype === "starting");
    context.advancedAbilities = abilityList.filter(a => a?.system.subtype === "advanced");
    context.standardAbilities = abilityList.filter(a => a?.system.subtype === "standard");
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);

    if ( !this.isEditable ) return;

    html.find("input.advancement-input").each((i, a) =>{
      a.addEventListener("focus", event => {
        event.preventDefault();
        event.stopPropagation();
        event.target.select();
      });
    });
  }
  //#endregion
  
  //#region Actions
  static async #addAdvancementRank(event) {
    event.preventDefault();
    
    const table = this.item.system.advancementTable ?? []
    table.push({
      rank: table.length + 1,
      attack: 0,
      hearts: 0,
      might: 0,
      deftness: 0,
      grit: 0,
      insight: 0,
      aura: 0,
      xp: 1
    });
    this.item.update({"system.advancementTable": table});
  }

  static async #removeAdvancementRank(event) {
    event.preventDefault();
    const table = this.item.system.advancementTable;
    table.pop();
    this.item.update({"system.advancementTable": table});
  }

  static async #removeAllowance(event) {
    event.preventDefault();
    const type = event.target.dataset.type;
    const key = event.target.dataset.key;
    const update = {};
    switch(type) {
      case "armor":
        const newArmorAllowances = this.item.system.armorAllowances.filter(a => a !== key);
        update["system.armorAllowances"] = newArmorAllowances;
        break;
      case "weapon":
        const newWeaponAllowances = this.item.system.weaponAllowances.filter(a => a !== key);
        update["system.weaponAllowances"] = newWeaponAllowances;
        break;
      case "shield":
        const newShieldAllowances = this.item.system.shieldAllowances.filter(a => a !== key);
        update["system.shieldAllowances"] = newShieldAllowances;
        break;
    }
    this.item.update(update);
  }

  static async onSelectFeature(event) {
    event.preventDefault();
    const featureType = event.target.dataset.type;
    let predefinedList = null;
    let filters = [];
    let callback = () => {};
    switch(featureType){
      case "ability":
        filters.push(a => a.system.type === "calling" && !this.document.system.abilities.includes(a.uuid));
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
  //#endregion

  _onDropValidItem(item) {
    this.addAbility(item);
  }

  //#region DocumentV2 submit
  static async #onSubmit(event, form, formData) {
    event.preventDefault();
    const updateData = foundry.utils.expandObject(formData.object);
    let render = true;
    if(updateData.system.advancementTable) {
      const table = Object.keys(updateData.system.advancementTable).map((k, i) => ({...updateData.system.advancementTable[i], rank: i+1}));
      if(JSON.stringify(table) !== JSON.stringify(this.document.system.advancementTable)) {
        updateData.system.advancementTable = table;
        render = false;
      }
    }
    console.log(this.document);
    if(updateData.armorAllowance) {
      updateData.system.armorAllowances = this.document.system.armorAllowances ?? [];
      if(!updateData.system.armorAllowances.includes(updateData.armorAllowance))
        updateData.system.armorAllowances.push(updateData.armorAllowance);
      delete updateData.armorAllowance;
    }
    if(updateData.weaponAllowance) {
      updateData.system.weaponAllowances = this.document.system.weaponAllowances ?? [];
      if(!updateData.system.weaponAllowances.includes(updateData.weaponAllowance))
        updateData.system.weaponAllowances.push(updateData.weaponAllowance);
      delete updateData.weaponAllowance;
    }
    if(updateData.shieldAllowance) {
      updateData.system.shieldAllowances = this.document.system.shieldAllowances ?? [];
      if(!updateData.system.shieldAllowances.includes(updateData.shieldAllowance))
        updateData.system.shieldAllowances.push(updateData.shieldAllowance);
      delete updateData.shieldAllowance;
    }
    console.log(updateData);
    await this.item.update(updateData, {render});
  }
  //#endregion
}
