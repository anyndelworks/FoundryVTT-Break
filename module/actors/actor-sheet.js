import { parseInputDelta } from "../../utils/utils.mjs";
import BREAK from "../constants.js";

const allowedItemTypes = [
// Equipment
  "weapon",
  "armor",
  "shield",
// Inventory
  "accessory",
  "ammo",
  "item",
  "outfit"
]

const {ActorSheetV2} = foundry.applications.sheets;
const {HandlebarsApplicationMixin} = foundry.applications.api;

export class BreakActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  freeHands;
  _headerCollapsed = false;
  _selectedAmmo = {};

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "actor"],
    position: {
      width: 750,
      height: 900,
    },
    form: {
      submitOnChange: true
    },
    window: {
      resizable: true
    },
    actions: {
      toggleHeader: this.#onToggleHeader,
      rollAttack: this.#onRollAttack,
      deleteItem: this.#deleteItemAction,
      editImage: this.#onEditImage,
      rollAptitude: this.#onRollAptitude,
      modifyHearts: this.#onModifyHearts,
      unequipItem: this.#onUnequipItem,
      linkItem: this.#onLinkItem,
      addCustomItem: this.#onAddCustomItem,
      adjustItemQuantity: this.#onAdjustItemQuantity,
      useAction: this.#onUseAction,
      selectAmmo: this.#onSelectAmmo
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    html.find("input.item-quantity").on("change", this._onChangeItemInput.bind(this));
    html.find("[data-ammo-select]").on("change", this._onSelectAmmo.bind(this));
  }

  _toggleSheetControls(disabled) {
    const viewActions = "[data-action='toggleEditable'], [data-action='toggleHeader'], [data-action='tab']";
    const content = $(this.element).find(".window-content");
    const root = content.length ? content : $(this.element);
    root
      .find("button, input, optgroup, option, select, textarea")
      .filter((i, element) => !element.closest(viewActions))
      .prop("disabled", disabled);
  }

  prepareActions(context) {
    context.actions = [];
    context.document.items.forEach(i => {
      if(i.system.actions) {
        i.system.actions.forEach(action => {
          context.actions.push({
            itemId: i._id,
            itemName: i.name,
            ...action,
            rollTypeName: game.i18n.localize(BREAK.roll_types[action.rollType].label),
            actionCostName: game.i18n.localize(BREAK.action_costs[action.cost].label)
          });
        });
      }
    });
  }

  prepareWeapons(context) {
    const weaponTypes = foundry.utils.deepClone(game.settings.get("break", "weaponTypes"));
    context.weapons = context.document.items.filter(i => i.type === "weapon");
    context.weapons = context.document.system.equipment.weapon.map(w => {
      const weaponTypeKeys = [w.system.weaponType1, w.system.weaponType2].filter(t => t);
      const ammo = context.document.items.filter(i => i.type === "ammo"
        && i.system.weaponType
        && weaponTypeKeys.includes(i.system.weaponType)
        && i.system.quantity > 0).map(i => ({
          id: i._id,
          name: i.name,
          special: i.system.special,
          attackModifier: i.system.attackModifier,
          damageModifier: i.system.damageModifier
        }));
      const selectedAmmo = ammo.some(a => a.id === this._selectedAmmo[w._id]) ? this._selectedAmmo[w._id] : "";
      return {
        id: w._id,
        name: w.name,
        type: (w.system.weaponType1 ? weaponTypes[w.system.weaponType1]?.label : "") + " " + (w.system.weaponType2 ? weaponTypes[w.system.weaponType2]?.label : ""),
        isRanged: w.system.ranged,
        isMelee: w.system.melee,
        rangedExtraDamage: w.system.rangedExtraDamage,
        extraDamage: w.system.extraDamage,
        rangedAttackBonus: w.system.rangedAttackBonus,
        attackBonus: w.system.attackBonus,
        ammo,
        selectedAmmo
      }
    });
  }

  prepareInventory(context) {
    const equipment = context.document.system.equipment;
    const equippedItemIds = [equipment.armor?._id, equipment.outfit?._id, equipment.shield?._id, ...equipment.weapon.map(i => i._id), ...equipment.accessory.map(i => i._id)];
    context.bagContent = context.document.items.filter(i => !["ability", "quirk", "gift", "calling", "history", "homeland", "species"].includes(i.type)
      && !equippedItemIds.includes(i._id) && i.bag == this.selectedBag).map(i => ({ ...i, _id: i._id, equippable: ["armor", "weapon", "outfit", "accessory", "shield"].includes(i.type) }));
    const precision = 2;
    const factor = Math.pow(10, precision);
    context.usedInventorySlots = Math.round(context.bagContent.reduce((ac, cv) => ac + cv.system.slots * cv.system.quantity, 0) * factor) / factor;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const equipment = context.document.system.equipment;
    context.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.notes, {
      secrets: this.document.isOwner,
      async: true
    });
    
    context.attackBonus = context.document.system.attack.total;
    context.speedRating = context.document.system.speed.total;
    context.speedRatingLabel = this.constructor.getSpeedRatingLabel(context.speedRating);
    const weaponHands = equipment.weapon.reduce((a, w) => a+(w.hands ?? 1), 0);
    this.freeHands = context.document.system.hands.total - weaponHands - (equipment.shield?.system.hands ?? 0);
    context.hands = context.document.system.hands.total;
    context.freeHands = this.freeHands;

    this.prepareWeapons(context);
    this.prepareActions(context);
    this.prepareInventory(context);
    context.headerCollapsed = this._headerCollapsed;

    return context;
  }
  //#endregion

  //#region Drag&Drop
  static getSpeedRatingLabel(speed) {
    if (+speed <= 0) return "BREAK.SLOW";
    if (+speed === 1) return "BREAK.AVERAGE";
    if (+speed === 2) return "BREAK.FAST";
    return "BREAK.VFAST";
  }

  _onDragStart(event) {
    const data = event.target.closest(".bag-item")?.dataset ?? {};
    if ( !data.type ) return super._onDragStart(event);
    event.dataTransfer.setData("application/json", JSON.stringify(data));
  }

  _canDragDrop(selector) {
    return true;
  }
  //#endregion

  //#region Actions
  static #deleteItemAction(event) {
    this._onDeleteItem(event.current);
  }

  async _onDeleteItem(element) {
    const id = element.dataset?.id ?? element.currentTarget?.attributes?.getNamedItem("data-id")?.value;
    await this.actor.deleteItem(id);
  }

  static async #onRollAttack(event) {
    event.preventDefault();
    const button = event.target;
    const bonus = button.dataset.bonus ?? 0;
    const extraDamage = button.dataset.extradamage ?? 0;
    const ammoId = button.closest("[data-weapon-card]")?.querySelector("[data-ammo-select]")?.value;
    const ammo = ammoId ? this.actor.items.get(ammoId) : null;
    if(ammo?.system.targetMode === "none") {
      await ammo.sendToChat();
      await this.actor.consumeAmmo(ammo);
      return;
    }
    this.actor.rollAttack(bonus, extraDamage, null, button.dataset.name, ammo);
  }

  static async #onEditImage(event, target) {
    const field = target.dataset.field || "img"
    const current = foundry.utils.getProperty(this.document, field)

    const fp = new foundry.applications.apps.FilePicker({
      type: "image",
      current: current,
      callback: (path) => this.document.update({ [field]: path })
    })

    fp.render(true)
  }

  static async #onRollAptitude(event) {
    event.preventDefault();
    const button = event.target.closest("[data-id]");
    const aptitudeId = button.dataset.id;
    this.actor.rollAptitude(aptitudeId)
  }

  static async #onModifyHearts(event) {
    event.preventDefault();
    const amount = event.target.dataset.amount;
    this.actor.modifyHp(+amount);
  }

  static async #onUnequipItem(event) {
    event.preventDefault();
    const button = event.target;
    const id = button.dataset.itemId;
    const type = button.dataset.type;

    this.actor.unequipItem(id, type);
  }

  static async #onLinkItem(event) {
    event.preventDefault();
    const button = event.target.closest("[data-id]");
    const id = button.dataset.id;
    const item = this.document.items.get(id);
    item.sheet.render(true);
  }

  static async #onAddCustomItem(event) {
    event.preventDefault();
    return Item.implementation.createDialog({}, {
      parent: this.actor, pack: this.actor.pack, types: [
        "weapon",
        "armor",
        "shield",
        "outfit",
        "accessory",
        "ammo",
        "item",
      ]
    });
  }

  static async #onAdjustItemQuantity(event) {
    event.preventDefault();
    const button = event.target;
    const { type } = button.parentElement.dataset;
    const input = button.parentElement.parentElement.querySelector("input");
    const min = input.min ? Number(input.min) : -Infinity;
    const max = input.max ? Number(input.max) : Infinity;
    let value = Number(input.value);
    if ( isNaN(value) ) return;
    value += type === "increase" ? 1 : -1;
    input.value = Math.min(Math.max(value, min), max);
    input.dispatchEvent(new Event("change"));
  }

  static #onUseAction(event) {
    event.preventDefault();
    const button = event.target;
    const {itemId, actionId} = button.dataset;
    this.actor.useAction(itemId, actionId);
  }

  static #onSelectAmmo(event) {
    event.preventDefault();
    this._onSelectAmmo(event);
  }

  _onSelectAmmo(event) {
    const weaponId = event.target.closest("[data-weapon-card]")?.dataset.weaponId;
    if(!weaponId) return;
    this._selectedAmmo[weaponId] = event.target.value;
  }

  static #onToggleHeader(event) {
    event.preventDefault();
    this._headerCollapsed = !this._headerCollapsed;
    this.render(true);
  }

  //#endregion

  async _onChangeItemInput(event) {
    event.preventDefault();
    const input = event.target;
    const itemId = input.closest("[data-id]")?.dataset.id;
    const item = this.document.items.get(itemId);
    if ( !item ) return;
    const result = parseInputDelta(input, item);
    if ( result !== undefined ) item.update({ [input.dataset.name]: result });
  }

  async _onEquipItem(item) {
    item?.effects?.forEach(effect => {
      effect.update({disabled: false});
    });
    switch(item.type){
      case "armor":
        this.actor.update({"system.equipment.armor": {...item, _id: item._id}});
        return;
      case "outfit":
        this.actor.update({ "system.equipment.outfit": { ...item, _id: item._id } });
        return;
      case "weapon":
        if((item.system.hands ?? 1) <= this.freeHands) {
          this.actor.system.equipment.weapon.push({ ...item, _id: item._id }) 
          this.actor.update({ "system.equipment.weapon": this.actor.system.equipment.weapon });
        } else {
          ui.notifications.warn("Not enough free hands to wield that weapon");
        }
        return;
      case "shield":
        if((item.system.hands ?? 1) <= this.freeHands) {
          this.actor.system.equipment.shield = item;
          this.actor.update({ "system.equipment.shield": this.actor.system.equipment.shield });
        } else {
          ui.notifications.warn("Not enough free hands to wield that shield");
        }
        return;
      case "accessory":
        this.actor.system.equipment.accessory.push({ ...item, _id: item._id })
        this.actor.update({ "system.equipment.accessory": this.actor.system.equipment.accessory });
        return;
    }
  }

  async _onSendToChat(element) {
    const id = element.dataset.id;
    const item = this.document.items.get(id);
    await item.sendToChat();
  }

  getSizes() {
    return foundry.utils.deepClone(game.settings.get("break", "sizes"));
  }
}
