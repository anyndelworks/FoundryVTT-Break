import { parseInputDelta } from "../../utils/utils.mjs";

const allowedItemTypes = [
// Equipment
  "weapon",
  "armor",
  "shield",
// Inventory
  "accessory",
  "item",
  "outfit"
]

const {ActorSheetV2} = foundry.applications.sheets;
const {HandlebarsApplicationMixin} = foundry.applications.api;

export class BreakActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  freeHands;

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    tag: "form",
    classes: ["break", "sheet", "actor"],
    position: {
      width: 750,
      height: 870,
    },
    form: {
      submitOnChange: true
    },
    window: {
      resizable: true
    },
    actions: {
      rollAttack: this.#onRollAttack,
      deleteItem: this.#deleteItemAction,
      editImage: this.#onEditImage,
      rollAptitude: this.#onRollAptitude,
      modifyHearts: this.#onModifyHearts,
      unequipItem: this.#onUnequipItem,
      linkItem: this.#onLinkItem,
      addCustomItem: this.#onAddCustomItem,
      adjustItemQuantity: this.#onAdjustItemQuantity,
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    html.find("input.item-quantity").on("change", this._onChangeItemInput.bind(this));
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.notes, {
      secrets: this.document.isOwner,
      async: true
    });


    const hearts = context.document.system.hearts;
    hearts.bon = (hearts.modifier ?? 0);
    let maxHearts = hearts.max + hearts.bon;
    context.document.system.hearts.value = Math.min(context.document.system.hearts.value, maxHearts);

    context.weapons = context.document.items.filter(i => i.type === "weapon");
    context.weapons = context.weapons.map(w => {
      return {
        id: w._id,
        name: w.name,
        type: (w.system.weaponType1?.name ?? "") + " " + (w.system.weaponType2?.name ?? ""),
        isRanged: w.system.ranged,
        isMelee: w.system.melee,
        rangedExtraDamage: w.system.rangedExtraDamage,
        extraDamage: w.system.extraDamage,
        rangedAttackBonus: w.system.rangedAttackBonus,
        attackBonus: w.system.attackBonus
      }
    });


    const armor = context.document.system.equipment.armor;
    const shield = context.document.system.equipment.shield;
    const speed = context.document.system.speed;
    const attack = context.document.system.attack;

    attack.bon = (attack.modifier ?? 0);
    context.attackBonus = attack.value + attack.bon;
    
    speed.bon = (speed.modifier ?? 0) - (shield ? shield.system.speedPenalty : 0);
    const rawSpeed = speed.value + speed.bon;
    // Max speed is 3 (Very Fast), or if armor is worn then the armor's speed limit if it's less
    const maxSpeed = Math.min(((armor && armor.system.speedLimit) ? +armor.system.speedLimit : 3), 3);
    context.speedRating = Math.min(rawSpeed, maxSpeed);

    context.hands = 2 + (context.document.system.hands?.modifier ?? 0);
    const equipment = context.document.system.equipment;
    const weaponHands = equipment.weapon.reduce((a, w) => a+(w.hands ?? 1), 0);
    this.freeHands = context.hands - weaponHands - (equipment.shield?.system.hands ?? 0);
    context.freeHands = this.freeHands;
    const equippedItemIds = [equipment.armor?._id, equipment.outfit?._id, equipment.shield?._id, ...equipment.weapon.map(i => i._id), ...equipment.accessory.map(i => i._id)];
    context.bagContent = context.document.items.filter(i => !["ability", "quirk", "gift", "calling", "history", "homeland", "species"].includes(i.type)
      && !equippedItemIds.includes(i._id) && i.bag == this.selectedBag).map(i => ({ ...i, _id: i._id, equippable: ["armor", "weapon", "outfit", "accessory", "shield"].includes(i.type) }));
    const precision = 2;
    const factor = Math.pow(10, precision);
    context.usedInventorySlots = Math.round(context.bagContent.reduce((ac, cv) => ac + cv.system.slots * cv.system.quantity, 0) * factor) / factor;
    return context;
  }
  //#endregion

  //#region Drag&Drop
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
    this.actor.deleteItem(id);
  }

  static async #onRollAttack(event) {
    event.preventDefault();
    const button = event.target;
    const bonus = button.dataset.bonus ?? 0;
    const extraDamage = button.dataset.extradamage ?? 0;
    this.actor.rollAttack(bonus, extraDamage, button.dataset.name);
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
  //#region DocumentV2 submit
  _getSubmitData(updateData = {}) {
    const formData = new FormDataExtended(this.form).object;
    return foundry.utils.expandObject(formData);
  }

  async _updateObject(event, formData) {
    const updateData = foundry.utils.expandObject(formData);
    await this.actor.update(updateData);
  }

  async _onSubmit(event) {
    event.preventDefault();
    const updateData = this._getSubmitData();
    await this.actor.update(updateData);
  }
  //#endregion
}
