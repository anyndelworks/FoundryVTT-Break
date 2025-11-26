import { BreakItemSheet } from "./item-sheet.js";
import BREAK from "../constants.js";
import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";

export class BreakSpeciesSheet extends BreakItemSheet {
  allowedItemTypes = ["ability"];
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
        deleteMaturativeAbility: this.#onDeleteMaturativeAbility,
        removeQuirkCategory: this.#onRemoveQuirkCategory,
        selectFeature: this.onSelectFeature
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
      template: "systems/break/templates/items/species/species-description-tab.hbs"
    },
    properties: {
      template: "systems/break/templates/items/species/species-properties-tab.hbs"
    },
  }

  static TABS = {
    primary: {
      initial: "description",
      tabs: [{id: "description", icon: "fas fa-scroll"}, {id: "properties", icon: "fas fa-sparkles"}],
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

    context.quirkCategories = context.document.system.quirkCategories ?? [];
    context.quirkCategoryList = Object.keys(BREAK.quirk_categories).map(k => ({
      key: k,
      label: game.i18n.localize(BREAK.quirk_categories[k]),
      disabled: context.quirkCategories.includes(k)
    }));
    context.quirkCategories = context.quirkCategoryList.filter(qc => qc.disabled);

    const abilityList = await Promise.all((context.document.system.abilities ?? []).map(async uuid => (await fromUuid(uuid))));
    context.innateAbilities = abilityList.filter(a => a?.system.subtype === "innate");
    context.maturativeAbilities = abilityList.filter(a => a?.system.subtype === "maturative");
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

  static async #onRemoveQuirkCategory(event) {
    event.preventDefault();
    const key = event.target.dataset.key;
    const update = {};
    const newQuirkCategories = this.item.system.quirkCategories.filter(a => a !== key);
    update["system.quirkCategories"] = newQuirkCategories;
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
        filters.push(a => a.system.type === "species" && !this.document.system.abilities?.includes(a.uuid));
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
      if(updateData.quirkCategory) {
        updateData.system.quirkCategories = this.document.system.quirkCategories ?? [];
        if(!updateData.system.quirkCategories.includes(updateData.quirkCategory))
          updateData.system.quirkCategories.push(updateData.quirkCategory);
        delete updateData.quirkCategory;
      }
      await this.item.update(updateData);
  }
  //#endregion
}
