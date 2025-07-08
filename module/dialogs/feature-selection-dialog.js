const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class FeatureSelectionDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  
  #itemType;
  #restricted;
  #predefinedList;

  constructor(...args) {
    super(...args);
    this.#itemType = this.options.itemType ?? "ability";
    this.#restricted = this.options.restricted ?? false;
    this.#predefinedList = this.options.predefinedList;
    this.actor = this.options.actor;
  }

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    tag: 'form',
    position: { width: 600, height: 700 },
    window: { title: 'BREAK.FeatureSelector', resizable: true },
    form: {
      handler: FeatureSelectionDialog.#onSubmitForm,
      closeOnSubmit: true
    },
    actions: {
      linkItem: this.#onLinkItem,
      pickItem: this.#onPickItem
    }
  }

  /** @inheritDoc */
  static PARTS = {
    form: {
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
      {name: "ability", i18n: "TYPES.Item.ability", active: "ability" === this.#itemType, disabled: this.#restricted && "ability" !== this.#itemType},
      {name: "accessory", i18n: "TYPES.Item.accessory", active: "accessory" === this.#itemType, disabled: this.#restricted && "accessory" !== this.#itemType},
      {name: "armor", i18n: "TYPES.Item.armor", active: "armor" === this.#itemType, disabled: this.#restricted && "armor" !== this.#itemType},
      {name: "armorType", i18n: "TYPES.Item.armor-type", active: "armorType" === this.#itemType, disabled: this.#restricted && "armorType" !== this.#itemType},
      {name: "calling", i18n: "TYPES.Item.calling", active: "calling" === this.#itemType, disabled: this.#restricted && "calling" !== this.#itemType},
      {name: "gift", i18n: "TYPES.Item.gift", active: "gift" === this.#itemType, disabled: this.#restricted && "gift" !== this.#itemType},
      {name: "history", i18n: "TYPES.Item.history", active: "history" === this.#itemType, disabled: this.#restricted && "history" !== this.#itemType},
      {name: "homeland", i18n: "TYPES.Item.homeland", active: "homeland" === this.#itemType, disabled: this.#restricted && "homeland" !== this.#itemType},
      {name: "item", i18n: "TYPES.Item.item", active: "item" === this.#itemType, disabled: this.#restricted && "item" !== this.#itemType},
      {name: "outfit", i18n: "TYPES.Item.outfit", active: "outfit" === this.#itemType, disabled: this.#restricted && "outfit" !== this.#itemType},
      {name: "quirk", i18n: "TYPES.Item.quirk", active: "quirk" === this.#itemType, disabled: this.#restricted && "quirk" !== this.#itemType},
      {name: "shield", i18n: "TYPES.Item.shield", active: "shield" === this.#itemType, disabled: this.#restricted && "shield" !== this.#itemType},
      {name: "shieldType", i18n: "TYPES.Item.shield-type", active: "shieldType" === this.#itemType, disabled: this.#restricted && "shieldType" !== this.#itemType},
      {name: "size", i18n: "TYPES.Item.size", active: "size" === this.#itemType, disabled: this.#restricted && "size" !== this.#itemType},
      {name: "species", i18n: "TYPES.Item.species", active: "species" === this.#itemType, disabled: this.#restricted && "species" !== this.#itemType},
      {name: "weapon", i18n: "TYPES.Item.weapon", active: "weapon" === this.#itemType, disabled: this.#restricted && "weapon" !== this.#itemType},
      {name: "weaponType", i18n: "TYPES.Item.weapon-type", active: "weaponType" === this.#itemType, disabled: this.#restricted && "weaponType" !== this.#itemType},
    ];
    if (this.#predefinedList) {
      console.log(this.#predefinedList)
      context.itemList = this.#predefinedList;
    } else {
      context.itemList = await this._getItemsOfType(context.itemType);
    }
    return context;
  }

  static async #onLinkItem(event) {
    event.preventDefault();
    const button = event.target.closest("[data-id]");
    const id = button.dataset.id;
    let item = game.items.find(i => i._id === id);
    if(!item) {
      for(const pack of game.packs) {
        if (pack.documentName !== "Item") continue;
        const allItems = await pack.getDocuments();
        item = allItems.find(i => i._id === id)
        if(item) {
          break;
        }
      }
    }
    item.sheet.render(true, {editable: false});
  }

  static async #onPickItem(event) {
    event.preventDefault();
    console.log(this.actor);
    const button = event.target.closest("[data-id]");
    const id = button.dataset.id;
    let item = game.items.find(i => i._id === id);
    if(!item) {
      for(const pack of game.packs) {
        if (pack.documentName !== "Item") continue;
        const allItems = await pack.getDocuments();
        item = allItems.find(i => i._id === id)
        if(item) {
          break;
        }
      }
    }
    await this.actor.createEmbeddedDocuments("Item", [item]);
    this.close();
  }

  static async #onSubmitForm(event, form, formData) {
    event.preventDefault()
    await this.document.update(formData.object)
  }
}