const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class FeatureSelectionDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  #allowedTypes;
  #itemType;
  predefinedList;
  #filters;
  picks;
  remainingPicks;
  pickedItems;

  constructor(...args) {
    super(...args);
    this.#itemType = this.options.itemType ?? "ability";
    this.#allowedTypes = this.options.allowedTypes ?? [this.#itemType];
    this.predefinedList = this.options.predefinedList;
    this.#filters = this.options.filters ?? [];
    this.document = this.options.document;
    this.callback = this.options.callback;
    this.picks = this.options.picks ?? 1;
    this.remainingPicks = this.picks;
    this.pickedItems = [];
  }

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    tag: 'div',
    position: { width: 600, height: 700 },
    context: {
      remainingPicks: 1
    },
    window: { title: 'BREAK.FeatureSelector', resizable: true },
    actions: {
      linkItem: this.#onLinkItem,
      pickItem: this.#onPickItem,
      unpickItem: this.#onUnpickItem
    }
  }

  /** @inheritDoc */
  static PARTS = {
    div: {
      template: 'systems/break/templates/dialogs/feature-selection-dialog.html'
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);

    html.find("#type-select").on("change", this._onChangeItemType.bind(this));
    html.find("#filter").on("input", this._onChangeFilter.bind(this));
  }

  _onChangeFilter(e) {
    const html = $(this.element);
    html.find(".item-entry").each((_i, el) => {
      const name = el.dataset.name.toLowerCase();
      if(!name.includes(e.target.value.toLowerCase())) {
        el.style.display = "none";
      } else {
        el.style.display = "inherit";
      }
    });
  }

  async _onChangeItemType(e) {
    this.#itemType = e.target.value;
    this.render();
  }

  async _getItemsOfType(type) {
    const items = [];
    const worldItems = game.items.filter(i => i.type === type);
    worldItems.forEach(i => {
      i.from = "World";
    });
    items.push(...worldItems);

    const compendiumItems = [];
    for(const pack of game.packs) {
      if (pack.documentName !== "Item") continue;
      const allItems = await pack.getDocuments({type});
      allItems.forEach(i => {
        i.from = `${pack.metadata.label}`;
      });
      compendiumItems.push(...allItems);
    }
    items.push(...compendiumItems);
    return items;
  }

  get title() {
    return game.i18n.localize('BREAK.FeatureSelector')
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    context.itemType = this.#itemType;
    context.options = [
      {name: "ability", i18n: "TYPES.Item.ability", active: "ability" === this.#itemType, disabled: !this.#allowedTypes.includes("ability")},
      {name: "accessory", i18n: "TYPES.Item.accessory", active: "accessory" === this.#itemType, disabled: !this.#allowedTypes.includes("accessory")},
      {name: "armor", i18n: "TYPES.Item.armor", active: "armor" === this.#itemType, disabled: !this.#allowedTypes.includes("armor")},
      {name: "armorType", i18n: "TYPES.Item.armor-type", active: "armorType" === this.#itemType, disabled: !this.#allowedTypes.includes("armorType") },
      {name: "calling", i18n: "TYPES.Item.calling", active: "calling" === this.#itemType, disabled: !this.#allowedTypes.includes("calling")},
      {name: "gift", i18n: "TYPES.Item.gift", active: "gift" === this.#itemType, disabled: !this.#allowedTypes.includes("gift")},
      {name: "history", i18n: "TYPES.Item.history", active: "history" === this.#itemType, disabled: !this.#allowedTypes.includes("history")},
      {name: "homeland", i18n: "TYPES.Item.homeland", active: "homeland" === this.#itemType, disabled: !this.#allowedTypes.includes("homeland")},
      {name: "item", i18n: "TYPES.Item.item", active: "item" === this.#itemType, disabled: !this.#allowedTypes.includes("item")},
      {name: "outfit", i18n: "TYPES.Item.outfit", active: "outfit" === this.#itemType, disabled: !this.#allowedTypes.includes("outfit")},
      {name: "quirk", i18n: "TYPES.Item.quirk", active: "quirk" === this.#itemType, disabled: !this.#allowedTypes.includes("quirk")},
      {name: "shield", i18n: "TYPES.Item.shield", active: "shield" === this.#itemType, disabled: !this.#allowedTypes.includes("shield")},
      {name: "shieldType", i18n: "TYPES.Item.shield-type", active: "shieldType" === this.#itemType, disabled: !this.#allowedTypes.includes("shieldType")},
      {name: "size", i18n: "TYPES.Item.size", active: "size" === this.#itemType, disabled: !this.#allowedTypes.includes("size")},
      {name: "species", i18n: "TYPES.Item.species", active: "species" === this.#itemType, disabled: !this.#allowedTypes.includes("species")},
      {name: "weapon", i18n: "TYPES.Item.weapon", active: "weapon" === this.#itemType, disabled: !this.#allowedTypes.includes("weapon")},
      {name: "weaponType", i18n: "TYPES.Item.weapon-type", active: "weaponType" === this.#itemType, disabled: !this.#allowedTypes.includes("weaponType")},
    ];
    if (this.predefinedList) {
      context.itemList = this.predefinedList;
    } else {
      context.itemList = await this._getItemsOfType(context.itemType);
    }
    this.#filters.forEach(f => {
      context.itemList = context.itemList.filter(f);
    });
    context.itemList.forEach(i => {
        i.picked = this.pickedItems.some(pi => pi.uuid === i.uuid);
    });
    context.remainingPicks = Number(this.remainingPicks);
    context.picks = this.picks;
    return context;
  }

  static async #onLinkItem(event) {
    event.preventDefault();
    const button = event.target.closest("[data-id]");
    const uuid = button.dataset.id;
    let item = game.items.find(i => i.uuid === uuid);
    if(!item) {
      for(const pack of game.packs) {
        if (pack.documentName !== "Item") continue;
        const allItems = await pack.getDocuments();
        item = allItems.find(i => i.uuid === uuid)
        if(item) {
          break;
        }
      }
    }
    item.sheet.render(true, {editable: false});
  }

  static async #onPickItem(event) {
    event.preventDefault();
    const button = event.target.closest("[data-id]");
    const uuid = button.dataset.id;
    let item = game.items.find(i => i.uuid === uuid);
    if(!item) {
      for(const pack of game.packs) {
        if (pack.documentName !== "Item") continue;
        const allItems = await pack.getDocuments();
        item = allItems.find(i => i.uuid === uuid)
        if(item) {
          break;
        }
      }
    }

    this.pickedItems.push(item);
    this.remainingPicks -= 1;
    if(this.remainingPicks <= 0) {
      if(this.document.documentName === "Actor") {
        await this.document.createEmbeddedDocuments("Item", this.pickedItems);
      } else if(this.document.documentName === "Item") {
        this.callback(this.pickedItems);
      }
      this.close();
    } else {
      this.render(true);
    }
  }

  static async #onUnpickItem(event) {
    event.preventDefault();
    const button = event.target.closest("[data-id]");
    const id = button.dataset.id;
    this.remainingPicks += 1;
    this.pickedItems = this.pickedItems.filter(pi => pi.uuid !== id);
    this.render(true);
  }

}