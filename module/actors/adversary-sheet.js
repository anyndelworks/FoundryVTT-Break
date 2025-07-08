import { BreakItem } from "../items/item.js";

const allowedItemTypes = ["ability", "accessory", "armor", "otherworld", "outfit", "shield", "item", "weapon"]

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class BreakAdversarySheet extends ActorSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["break", "sheet", "actor", "adversary"],
      template: "systems/break/templates/actors/adversary/adversary-sheet.html",
      width: 750,
      height: 850,
      tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "identity"}],
      scrollY: [".content"],
      dragDrop: [{dragSelector: null, dropSelector: null, permissions: {drop: () => false}}]
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async _onDrop(event) {
    const t = event.target.closest(".equipment-drag-slot")
    if (!event.target.closest(".equipment-drag-slot")) return super._onDrop(event);
    const dragData = event.dataTransfer.getData("application/json");
    if (!dragData) return super._onDrop(event);
    const id = JSON.parse(dragData).id;
    const item = this.actor.items.find(i => i._id == id);
    this._onEquipItem(item);

    return true;
  }

  /** @override */
  async _onDropItem(event, data) {
    if ( !this.actor.isOwner ) return false;
    const item = await Item.implementation.fromDropData(data);
    if(!allowedItemTypes.includes(item.type)) {return false;}
    if(this.actor.items.some(i => i._id === item._id)) {return false;}

    return BreakItem.createDocuments([item], {pack: this.actor.pack, parent: this.actor, keepId: true});
  }

  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);
    context.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.actor.system.notes, {
      secrets: this.document.isOwner,
      async: true
    });

    context.actor.system.hearts.value = context.actor.system.hearts.value ?? context.actor.system.hearts.max;
    context.abilities = context.actor.items.filter(i => i.type === "ability");
    context.weapons = context.actor.items.filter(i => i.type === "weapon");
    context.weapons = context.weapons.map(w => {
      return {
        id: w._id,
        name: w.name,
        type: (w.system.weaponType1?.name ?? "") + " " + (w.system.weaponType2?.name ?? ""),
        isRanged: w.system.weaponType1?.system.ranged || w.system.weaponType2?.system.ranged,
        isMelee: (w.system.weaponType1 && !w.system.weaponType1.system.ranged) || (w.system.weaponType2 && !w.system.weaponType2.system.ranged),
        rangedExtraDamage: w.system.rangedExtraDamage,
        extraDamage: w.system.extraDamage,
        rangedAttackBonus: w.system.rangedAttackBonus,
        attackBonus: w.system.attackBonus
      }
    });
    if (context.actor.system.equipment.armor && context.actor.system.equipment.armor.system.speedLimit != null && context.actor.system.equipment.armor.system.speedLimit != "") {
      context.speedRating = +context.actor.system.equipment.armor.system.speedLimit < context.speedRating ? +context.actor.system.equipment.armor.system.speedLimit : context.speedRating;
    }

    context.sizes = this.getSizes();

    const size = context.sizes.length > 0 && context.actor.system.size ? context.sizes.find(item => item.name === context.actor.system.size) : null;

    context.actor.system.aptitudes.might.trait = size ? size.system.mightModifier : 0;
    context.actor.system.aptitudes.deftness.trait = size ? size.system.deftnessModifier : 0;

    context.defenseRating = +context.actor.system.defense.value + +context.actor.system.defense.bon + (context.actor.system.equipment.armor ? +context.actor.system.equipment.armor.system.defenseBonus : 0) + (context.speedRating == 2 ? 2 : +context.speedRating >= 3 ? 4 : 0) + (size ? +size.system.defenseModifier : 0);
    const equipment = context.actor.system.equipment;
    const equippedItemIds = [equipment.armor?._id, equipment.outfit?._id, ...equipment.weapon.map(i => i._id), ...equipment.accessory.map(i => i._id)];
    context.bagContent = context.actor.items.filter(i => !["ability", "quirk", "gift"].includes(i.type)
      && !equippedItemIds.includes(i._id) && i.bag == this.selectedBag).map(i => ({ ...i, _id: i._id, equippable: ["armor", "weapon", "outfit", "accessory", "shield"].includes(i.type) }));
    const precision = 2;
    const factor = Math.pow(10, precision);
    context.usedInventorySlots = Math.round(context.bagContent.reduce((ac, cv) => ac + cv.system.slots * cv.system.quantity, 0) * factor) / factor;

    context.attackBonus = context.actor.system.attack.value + context.actor.system.attack.bon;
    context.speedRating = context.actor.system.speed.value + context.actor.system.speed.bon;

    //Fix line break issue with textarea input
    context.actor.system.misc.habitat = context.actor.system.misc.habitat.replaceAll("\n", "&#10;")
    context.actor.system.misc.gearInfo = context.actor.system.misc.gearInfo.replaceAll("\n", "&#10;")
    context.actor.system.misc.communication = context.actor.system.misc.communication.replaceAll("\n", "&#10;")
    context.actor.system.misc.tactics = context.actor.system.misc.tactics.replaceAll("\n", "&#10;")
    context.actor.system.misc.indicators = context.actor.system.misc.indicators.replaceAll("\n", "&#10;")
    context.actor.system.misc.rpNote = context.actor.system.misc.rpNote.replaceAll("\n", "&#10;")
    context.actor.system.misc.customization = context.actor.system.misc.customization.replaceAll("\n", "&#10;")
    context.actor.system.misc.yield = context.actor.system.misc.yield.replaceAll("\n", "&#10;")
    context.actor.system.misc.reskin = context.actor.system.misc.reskin.replaceAll("\n", "&#10;")

    return context;
  }

  getSizes() {
    const sizes = [];
    for (const item of game.items) {
      if (item.type === "size") {
        sizes.push(item);
      }
    }

    return sizes;
  }

  getSize(id) {
    return context.sizes.find(item => item._id === id);
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".aptitude-value-circle.clickable").on("click", this._onRollAptitude.bind(this));
    html.find(".combat-value-circle.clickable").on("click", this._onRollAttack.bind(this));

    html.find("i.attack-ranged").on("click", this._onRollAttack.bind(this));
    html.find("i.attack-melee").on("click", this._onRollAttack.bind(this));

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    html.find("button.hearts.clickable").on("click", this._onModifyHearts.bind(this));

    html.find("i.delete-weapon").on("click", this._onDeleteItem.bind(this));
    html.find("i.unequip-item").on("click", this._onUnequipItem.bind(this));
    html.find("a.item-link").on("click", this._onLinkItem.bind(this));

    html.find("a.add-item-custom").on("click", this._onAddItemCustom.bind(this));
    html.find("a.adjustment-button").on("click", this._onAdjustItemQuantity.bind(this));
    html.find("input.item-quantity").on("change", this._onChangeItemInput.bind(this));

    // Add draggable for Macro creation
    html.find(".aptitudes a.aptitude-roll").each((i, a) => {
      a.setAttribute("draggable", true);
      a.addEventListener("dragstart", ev => {
        let dragData = ev.currentTarget.dataset;
        ev.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }, false);
    });

    html.find("[data-context-menu]").each((i, a) => {
      a.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const { clientX, clientY } = event;
        event.currentTarget.closest("[data-id]").dispatchEvent(new PointerEvent("contextmenu", {
          view: window, bubbles: true, cancelable: true, clientX, clientY
        }));
      });
    })

    new ContextMenu(html, "[data-id]", [], { onOpen: this._onOpenContextMenu.bind(this) });
  }

  async _onRollAptitude(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const aptitudeId = button.dataset.id;
    this.actor.rollAptitude(aptitudeId)

  }

  async _onEquipItem(item) {
    switch (item.type) {
      case "armor":
        this.actor.update({ "system.equipment.armor": { ...item, _id: item._id } });
        return;
      case "outfit":
        this.actor.update({ "system.equipment.outfit": { ...item, _id: item._id } });
        return;
      case "weapon":
        this.actor.system.equipment.weapon.push({ ...item, _id: item._id })
        this.actor.update({ "system.equipment.weapon": this.actor.system.equipment.weapon });
        return;
      case "accessory":
        this.actor.system.equipment.accessory.push({ ...item, _id: item._id })
        this.actor.update({ "system.equipment.accessory": this.actor.system.equipment.accessory });
        return;
    }
  }

  async _onUnequipItem(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const type = button.dataset.type;
    const updates = {};
    if (button.dataset.itemId != null) {
      var itemIndex = this.actor.system.equipment[type].findIndex((element) => element._id == button.dataset.itemId);
      this.actor.system.equipment[type].splice(itemIndex, 1)
      updates[`system.equipment.${type}`] = this.actor.system.equipment[type];
    }
    else {
      updates[`system.equipment.${type}`] = null;
    }
    this.actor.update(updates);
  }

  async _onDeleteItem(element) {
    const id = element.dataset?.id ?? element.currentTarget?.attributes?.getNamedItem("data-id")?.value;
    this.actor.deleteItem(id);
  }

  async _onRollAttack(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const bonus = button.dataset.bonus ?? 0;
    const extraDamage = button.dataset.extradamage ?? 0;
    this.actor.rollAttack(bonus, extraDamage)
  }

  async _onModifyHearts(event) {
    event.preventDefault();
    const amount = event.currentTarget.dataset.amount;
    this.actor.modifyHp(+amount);
  }

  _onOpenContextMenu(element) {
    const item = this.document.items.get(element.dataset.id);
    if (!item || (item instanceof Promise)) return;

    item.equippable = element.dataset.equippable;
    ui.context.menuItems = this._getContextOptions(item);
  }

  _getContextOptions(item) {
    const options = [
      {
        name: "BREAK.Equip",
        icon: "<i class='fa-solid fa-shield'></i>",
        condition: () => item.equippable === 'true',
        callback: li => {
          const id = li[0].dataset?.id ?? li[0].currentTarget?.attributes?.getNamedItem("data-id")?.value;
          const item = this.document.items.get(id);
          this._onEquipItem(item);
        }
      },
      {
        name: "BREAK.SendToChat",
        icon: "<i class='fa-solid fa-fw fa-comment-alt'></i>",
        condition: () => item.isOwner,
        callback: li => this._onSendToChat(li[0])
      },
      {
        name: "BREAK.ContextMenuDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        condition: () => item.isOwner,
        callback: li => this._onDeleteItem(li[0])
      }
    ];

    return options;
  }

  async _onDeleteItem(element) {
    const id = element.dataset?.id ?? element.currentTarget?.attributes?.getNamedItem("data-id")?.value;
    this.actor.deleteItem(id);
  }

  async _onSendToChat(element) {
    const id = element.dataset.id;
    const item = this.document.items.get(id);
    await item.sendToChat();
  }

  async _onLinkItem(event) {
    event.preventDefault();
    const button = event.currentTarget.closest("[data-id]");
    const id = button.dataset.id;
    const item = this.document.items.get(id);
    item.sheet.render(true);
  }

  async _onAddItemCustom(event) {
    event.preventDefault();
    return Item.implementation.createDialog({}, {
      parent: this.actor, pack: this.actor.pack, types: ["weapon", "armor", "shield", "outfit", "accessory", "item"]
    });
  }

  async _onAdjustItemQuantity(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const { action } = button.dataset;
    const input = button.parentElement.querySelector("input");
    const min = input.min ? Number(input.min) : -Infinity;
    const max = input.max ? Number(input.max) : Infinity;
    let value = Number(input.value);
    if (isNaN(value)) return;
    value += action === "increase" ? 1 : -1;
    input.value = Math.clamp(value, min, max);
    input.dispatchEvent(new Event("change"));
  }

  async _onChangeItemInput(event) {
    event.preventDefault();
    const input = event.target;
    const itemId = input.closest("[data-id]")?.dataset.id;
    const item = this.document.items.get(itemId);
    if (!item) return;
    const result = parseInputDelta(input, item);
    if (result !== undefined) item.update({ [input.dataset.name]: result });
  }


  /* -------------------------------------------- */

  /** @inheritdoc */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    //formData = EntitySheetHelper.updateAptitudes(formData, this.object);
    //formData = EntitySheetHelper.updateGroups(formData, this.object);
    return formData;
  }
}
