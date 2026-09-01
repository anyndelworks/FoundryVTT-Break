import { parseInputDelta } from "../../utils/utils.mjs";
import BREAK from "../constants.js";
import Action from "../system/action.js";
import { BreakBaseActorDataModel } from "../models/base-actor.js";
import { canStoreItem, getContainerAccessCostLabel, getContainerUsedSlots, getItemSlots } from "../models/container-capable.js";

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
  _selectedInventoryContainerId = "";

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
      selectAmmo: this.#onSelectAmmo,
      selectInventoryContainer: this.#onSelectInventoryContainer
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable || this._viewOnly) return;

    html.find("input.item-quantity").on("change", this._onChangeItemInput.bind(this));
    html.find("[data-ammo-select]").on("change", this._onSelectAmmo.bind(this));

    this.element.querySelectorAll("[data-inventory-item]").forEach(item => {
      item.addEventListener("dragstart", this._onInventoryDragStart.bind(this));
      item.addEventListener("dragend", this._clearInventoryDragState.bind(this));
    });
    this.element.querySelectorAll("[data-inventory-drop]").forEach(target => {
      target.addEventListener("dragover", this._onInventoryDragOver.bind(this));
      target.addEventListener("dragleave", this._onInventoryDragLeave.bind(this));
      target.addEventListener("drop", this._onInventoryDrop.bind(this));
    });
    this.element.querySelectorAll("[data-equipment-drop]").forEach(target => {
      target.addEventListener("dragover", this._onInventoryDragOver.bind(this));
      target.addEventListener("dragleave", this._onInventoryDragLeave.bind(this));
      target.addEventListener("drop", this._onEquipmentDrop.bind(this));
    });
  }

  _toggleSheetControls(disabled) {
    const viewActions = "[data-action='toggleEditable'], [data-action='toggleHeader'], [data-action='tab'], [data-action='selectInventoryContainer']";
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
          const resolvedAction = Action.resolveForActor(action, context.document);
          context.actions.push({
            itemId: i._id,
            itemName: i.name,
            ...resolvedAction,
            rollTypeName: game.i18n.localize(BREAK.roll_types[resolvedAction.rollType].label),
            actionCostName: game.i18n.localize(BREAK.action_costs[resolvedAction.cost].label)
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
    const equippedItemIds = new Set([
      equipment.armor?._id,
      equipment.outfit?._id,
      equipment.shield?._id,
      ...(equipment.weapon ?? []).map(item => item._id),
      ...(equipment.accessory ?? []).map(item => item._id)
    ].filter(id => id));
    const excludedItemTypes = ["ability", "quirk", "gift", "calling", "history", "homeland", "species"];
    const equippableItemTypes = ["armor", "weapon", "outfit", "accessory", "shield"];
    const allContainers = context.document.items.filter(item => item.system.container?.enabled);
    const allContainerIds = new Set(allContainers.map(container => container.id));
    const containers = allContainers.filter(container => equippedItemIds.has(container.id));
    const inventoryItems = context.document.items.filter(item => !excludedItemTypes.includes(item.type)
      && !equippedItemIds.has(item.id));
    const precision = 2;
    const factor = Math.pow(10, precision);
    const prepareItem = item => ({
      ...item,
      _id: item.id,
      equippable: equippableItemTypes.includes(item.type)
    });

    context.bagContent = inventoryItems
      .filter(item => !allContainerIds.has(item.system.containerId))
      .map(prepareItem);
    const equippedItems = [
      equipment.armor,
      equipment.shield,
      ...(equipment.weapon ?? []),
      ...(equipment.accessory ?? [])
    ].filter(item => item);
    const bagContentSlots = context.bagContent.reduce((total, item) => total + getItemSlots(item), 0);
    const equipmentSlots = equippedItems.reduce((total, item) => total + getItemSlots(item), 0);
    context.usedInventorySlots = Math.round((bagContentSlots + equipmentSlots) * factor) / factor;
    context.inventorySlots = context.document.system.inventorySlots ?? context.document.system.slots.total;

    context.inventoryContainers = containers.map(container => {
      const items = inventoryItems
        .filter(item => item.system.containerId === container.id)
        .map(prepareItem);
      const usedSlots = getContainerUsedSlots(this.actor, container.id);
      const allowedTypes = container.system.container.allowedItemTypes ?? [];
      const allowedCategories = container.system.container.allowedItemCategories ?? [];

      return {
        id: container.id,
        name: container.name,
        img: container.img,
        usedSlots: Math.round(usedSlots * factor) / factor,
        capacity: container.system.container.capacity,
        accessCostLabel: getContainerAccessCostLabel(container.system.container.accessCost),
        unrestricted: !allowedTypes.length && !allowedCategories.length,
        allowedLabels: [
          ...allowedTypes.map(type => game.i18n.localize(`TYPES.Item.${type}`)),
          ...allowedCategories.map(category => game.i18n.localize(BREAK.item_types[category] ?? category))
        ].join(", "),
        items
      };
    });

    if (!containers.some(container => container.id === this._selectedInventoryContainerId)) {
      this._selectedInventoryContainerId = "";
    }
    const baseLocation = {
      id: "",
      name: game.i18n.localize("BREAK.CONTAINER.BaseInventory"),
      icon: "fa-box-open",
      usedSlots: context.usedInventorySlots,
      capacity: context.inventorySlots,
      accessCostLabel: getContainerAccessCostLabel(0),
      unrestricted: true,
      items: context.bagContent
    };
    context.inventoryLocations = [baseLocation, ...context.inventoryContainers].map(location => ({
      ...location,
      active: location.id === this._selectedInventoryContainerId,
      overCapacity: location.usedSlots > location.capacity,
      remainingSlots: Math.round(Math.max(location.capacity - location.usedSlots, 0) * factor) / factor,
      usedPercent: location.capacity > 0
        ? Math.min(Math.round((location.usedSlots / location.capacity) * 100), 100)
        : location.usedSlots > 0 ? 100 : 0
    }));
    context.selectedInventoryLocation = context.inventoryLocations.find(location => location.active) ?? baseLocation;
    context.showCurrency = context.document.system.currency != null;
    context.showEquipmentSection = true;
    context.showInventorySection = true;
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

  static async #onUnequipItem(event, target) {
    event.preventDefault();
    const button = target ?? event.target.closest("[data-action='unequipItem']");
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

  static #onSelectInventoryContainer(event, target) {
    event.preventDefault();
    const button = target ?? event.target.closest("[data-action='selectInventoryContainer']");
    this._selectedInventoryContainerId = button?.dataset.containerId ?? "";
    this.render(true);
  }

  _onInventoryDragStart(event) {
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (!item) return;

    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify({
      type: "Item",
      id: item.id,
      uuid: item.uuid
    }));
    event.currentTarget.classList.add("is-dragging");
    this.element.classList.add("is-moving-inventory-item");
  }

  _onInventoryDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    event.currentTarget.classList.add("is-drop-target");
  }

  _onInventoryDragLeave(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    event.currentTarget.classList.remove("is-drop-target");
  }

  async _onInventoryDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const item = this._getInventoryDragItem(event);
    if (!item && data.type !== "Item") return;

    event.preventDefault();
    event.stopPropagation();
    const containerId = event.currentTarget.dataset.containerId || null;
    this._clearInventoryDragState();

    if (!item) {
      await this._onDropExternalInventoryItem(event, data, containerId);
      return;
    }

    const previousContainerId = this._selectedInventoryContainerId;
    this._selectedInventoryContainerId = containerId ?? "";
    const moved = await this._moveItemToContainer(item, containerId);
    if (!moved) this._selectedInventoryContainerId = previousContainerId;
  }

  async _onDropExternalInventoryItem(event, data, containerId) {
    const sourceItem = await Item.implementation.fromDropData(data);
    if (!sourceItem || !allowedItemTypes.includes(sourceItem.type)) return;

    if (containerId && !this._canMoveItemToContainer(sourceItem, containerId)) return;

    const existingItemIds = new Set(this.actor.items.map(item => item.id));
    const previousContainerId = this._selectedInventoryContainerId;
    this._selectedInventoryContainerId = containerId ?? "";
    await this._onDrop(event);

    const createdItems = this.actor.items.filter(item => !existingItemIds.has(item.id));
    if (!createdItems.length) {
      this._selectedInventoryContainerId = previousContainerId;
      return;
    }
    if (!containerId) return;

    await this.actor.updateEmbeddedDocuments("Item", createdItems.map(createdItem => ({
      _id: createdItem.id,
      "system.containerId": containerId
    })));
  }

  async _onEquipmentDrop(event) {
    const item = this._getInventoryDragItem(event);
    if (!item) return;

    event.preventDefault();
    event.stopPropagation();
    this._clearInventoryDragState();
    if (!["armor", "weapon", "outfit", "accessory", "shield"].includes(item.type)) return;
    await this._onEquipItem(item);
  }

  _getInventoryDragItem(event) {
    try {
      const data = JSON.parse(event.dataTransfer.getData("application/json"));
      return data.id ? this.actor.items.get(data.id) : null;
    } catch {
      return null;
    }
  }

  _clearInventoryDragState() {
    this.element?.classList.remove("is-moving-inventory-item");
    this.element?.querySelectorAll(".is-dragging, .is-drop-target").forEach(element => {
      element.classList.remove("is-dragging", "is-drop-target");
    });
  }

  async _moveItemToContainer(item, containerId) {
    if ((item.system.containerId ?? null) === containerId) return true;

    if (!containerId) {
      await item.update({ "system.containerId": null });
      return true;
    }

    if (!this._canMoveItemToContainer(item, containerId, item.id)) return false;

    await item.update({ "system.containerId": containerId });
    return true;
  }

  _canMoveItemToContainer(item, containerId, excludedItemId = null) {
    const container = this.actor.items.get(containerId);
    if (!canStoreItem(container, item)) {
      ui.notifications.warn(game.i18n.localize("BREAK.CONTAINER.InvalidItem"));
      return false;
    }

    const usedSlots = getContainerUsedSlots(this.actor, containerId, excludedItemId);
    if (usedSlots + getItemSlots(item) > container.system.container.capacity) {
      ui.notifications.warn(game.i18n.localize("BREAK.CONTAINER.NotEnoughCapacity"));
      return false;
    }

    return true;
  }

  async _onEquipItem(item) {
    if (item.system.containerId) await item.update({ "system.containerId": null });
    const enableItemEffects = () => Promise.all(item?.effects?.map(effect => effect.update({disabled: false})) ?? []);
    switch(item.type){
      case "armor":
        if (this.actor.system.equipment.armor && this.actor.system.equipment.armor._id !== item.id) {
          await this.actor.unequipItem(this.actor.system.equipment.armor._id, "armor");
        }
        await enableItemEffects();
        return this.actor.update({"system.equipment.armor": {...item, _id: item._id}});
      case "outfit":
        if (this.actor.system.equipment.outfit && this.actor.system.equipment.outfit._id !== item.id) {
          await this.actor.unequipItem(this.actor.system.equipment.outfit._id, "outfit");
        }
        await enableItemEffects();
        return this.actor.update({ "system.equipment.outfit": { ...item, _id: item._id } });
      case "weapon":
        if (this.actor.system.equipment.weapon.some(weapon => weapon._id === item.id)) return;
        if((item.system.hands ?? 1) <= this.freeHands) {
          await enableItemEffects();
          this.actor.system.equipment.weapon.push({ ...item, _id: item._id }) 
          return this.actor.update({ "system.equipment.weapon": this.actor.system.equipment.weapon });
        } else {
          ui.notifications.warn("Not enough free hands to wield that weapon");
        }
        return;
      case "shield": {
        if (this.actor.system.equipment.shield?._id === item.id) return;
        const availableHands = this.freeHands + Number(this.actor.system.equipment.shield?.system?.hands ?? 0);
        if((item.system.hands ?? 1) <= availableHands) {
          if (this.actor.system.equipment.shield) await this.actor.unequipItem(this.actor.system.equipment.shield._id, "shield");
          await enableItemEffects();
          this.actor.system.equipment.shield = item;
          return this.actor.update({ "system.equipment.shield": this.actor.system.equipment.shield });
        } else {
          ui.notifications.warn("Not enough free hands to wield that shield");
        }
        return;
      }
      case "accessory":
        if (this.actor.system.equipment.accessory.some(accessory => accessory._id === item.id)) return;
        await enableItemEffects();
        this.actor.system.equipment.accessory.push({ ...item, _id: item._id })
        return this.actor.update({ "system.equipment.accessory": this.actor.system.equipment.accessory });
    }
  }

  async _onSendToChat(element) {
    const id = element.dataset.id;
    const item = this.document.items.get(id);
    await item.sendToChat();
  }

  getSizes() {
    return BreakBaseActorDataModel.getSizeEntries().map(size => ({
      key: String(size.value),
      value: size.value,
      label: size.data.label
    }));
  }
}
