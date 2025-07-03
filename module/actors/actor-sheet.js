import { parseInputDelta } from "../../utils/utils.mjs";
import { RANK_XP} from "../constants.js";
import { BreakItem } from "../items/item.js";
import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";

const allowedItemTypes = [
// Equipment
  "weapon",
  "armor",
  "shield",
// Inventory
  "accessory",
  "item",
  "outfit",
// Status
  "calling",
  "species",
  "size",
  "homeland",
  "history",
  "quirk",
  "ability",
  "gift",
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
      selectFeature: this.#onSelectFeature,
      setTrait: this.#onSetTrait,
      unequipItem: this.#onUnequipItem,
      linkItem: this.#onLinkItem,
      addCustomItem: this.#onAddCustomItem,
      adjustItemQuantity: this.#onAdjustItemQuantity,
    }
  }

  static TABS = {
    primary: {
      initial: "identity",
      tabs: [{id: "identity", icon: "fas fa-hood-cloak"}, {id: "combat", icon: "fas fa-sword"}, {id: "inventory", icon: "fas fa-sack"}, {id:"notes", icon: "fas fa-scroll"}],
    }
  }

  static PARTS = {
    tabs: {
      template: "systems/break/templates/actors/character/parts/sheet-tabs.hbs",
    },
    identity: {
      template: "systems/break/templates/actors/character/parts/sheet-tab-identity.hbs",
      scrollable: [""]
    },
    combat: {
      template: "systems/break/templates/actors/character/parts/sheet-tab-combat.hbs",
      scrollable: ['']
    },
    inventory: {
      template: "systems/break/templates/actors/character/parts/sheet-tab-inventory.hbs",
      scrollable: ['']
    },
    notes: {
      template: "systems/break/templates/actors/character/parts/sheet-tab-notes.hbs",
      scrollable: ['']
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

    html.find("input.item-quantity").on("change", this._onChangeItemInput.bind(this));

    html.find("[data-context-menu]").each((i, a) =>{
      a.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const { clientX, clientY } = event;
        event.currentTarget.closest("[data-id]").dispatchEvent(new PointerEvent("contextmenu", {
          view: window, bubbles: true, cancelable: true, clientX, clientY
        }));
      });
    })

    new foundry.applications.ux.ContextMenu.implementation(html[0], "[data-id]", [], {onOpen: this._onOpenContextMenu.bind(this), jQuery: false});

    /*new foundry.applications.ux.DragDrop.implementation({
          dragSelector: ".draggable",
          permissions: {
            dragstart: this._canDragStart.bind(this),
            drop: this._canDragDrop.bind(this)
          },
          callbacks: {
            dragstart: this._onDragStart.bind(this),
            dragover: this._onDragOver.bind(this),
            drop: this._onDrop.bind(this)
          }
    }).bind(this.element);*/
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.biographyHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.biography, {
      secrets: this.document.isOwner,
      async: true
    });
    context.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.notes, {
      secrets: this.document.isOwner,
      async: true
    });

    for(let i = 0; i < RANK_XP.length; i++){
      if(RANK_XP[i] <= context.document.system.xp.current) {
        context.rank = i + 1;
      } else {
        context.xpNextRank = RANK_XP[i] - context.document.system.xp.current;
        break;
      }
    }

    //////////////////////////////
    ////  CONFIGURE SPECIES & SIZE
    context.species = context.document.items.find(i => i.type === "species");
    context.hasSpecies = context.species != null;

    const size = context.hasSpecies ? context.species.system.size : null;
    context.size = size;

    ///////////////////////
    ////  CONFIGURE CALLING

    context.calling = context.document.items.find(i => i.type === "calling");
    context.hasCalling = context.calling != null;
    
    if (context.hasCalling && context.calling.system.advancementTable?.length > 0) {
      const stats = context.calling.system.advancementTable[context.rank - 1];

      context.document.system.aptitudes.might.value = stats.might + (size ? size.system.mightModifier : 0);
      context.document.system.aptitudes.deftness.value = stats.deftness + (size ? size.system.deftnessModifier : 0);
      context.document.system.aptitudes.grit.value = stats.grit;
      context.document.system.aptitudes.insight.value = stats.insight;
      context.document.system.aptitudes.aura.value = stats.aura;

      context.document.system.attack.value = stats.attack;
      context.document.system.hearts.max = stats.hearts;

      context.document.system.defense.value = context.calling.system.baseDefense + (size ? +size.system.defenseModifier : 0);
      context.document.system.speed.value = context.calling.system.baseSpeed;
    }

    //////////////////////////////////
    ////  CONFIGURE HOMELAND & HISTORY
    context.homeland = context.document.items.find(i => i.type === "homeland");
    context.hasHomeland = context.homeland != null;

    context.history = context.document.items.find(i => i.type === "history");
    context.hasHistory = context.history != null;

    ///////////////////////////
    ////  CONFIGURE HEARTS & XP
    // Reset player hearts so they don't exceed maximum, in case that changed
    let maxHearts = context.document.system.hearts.max + context.document.system.hearts.bon;
    context.document.system.hearts.value = Math.min(context.document.system.hearts.value, maxHearts);

    context.abilities = context.document.items.filter(i => i.type === "ability");
    context.gifts = context.document.items.filter(i => i.type === "gift");
    context.quirks = context.document.items.filter(i => i.type === "quirk");
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

    const attack = context.document.system.attack;
    const defense = context.document.system.defense;
    const speed = context.document.system.speed;

    const armor = context.document.system.equipment.armor;
    const shield = context.document.system.equipment.shield;

    context.attackBonus = attack.value + attack.bon;
    const rawSpeed = speed.value + speed.bon - (shield ? shield.speedPenalty : 0);
    // Max speed is 3 (Very Fast), or if armor is worn then the armor's speed limit if it's less
    const maxSpeed = Math.min(((armor && armor.system.speedLimit) ? +armor.system.speedLimit : 3), 3);
    context.speedRating = Math.min(rawSpeed, maxSpeed);
    context.defenseRating = defense.value + defense.bon + (armor ? +armor.system.defenseBonus : 0) + (context.speedRating == 2 ? 2 : +context.speedRating >= 3 ? 4 : 0);

    let allegiancePoints = +context.document.system.allegiance.dark + +context.document.system.allegiance.bright;
    // 0 = None, 1 = Bright, 2 = Twilight, 3 = Bright
    if(+allegiancePoints <= 1){
      context.allegiance = 0;
    } else if(+context.document.system.allegiance.dark > +context.document.system.allegiance.bright+1){
      context.allegiance = 1;
    } else if(+context.document.system.allegiance.bright > +context.document.system.allegiance.dark+1) {
      context.allegiance = 3;
    } else {
      context.allegiance = 2;
    }

    context.hands = 2;
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
    context.document.system.purviews = context.document.system.purviews.replaceAll("\n", "&#10;")
    context.inventorySlots = size?.system.inventory ?? 0;
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

  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if(data.type !== "Item") return;
    const draggedItem = await fromUuid(data.uuid);

    switch(draggedItem.type) {
      case "calling":
      case "species":
      case "homeland":
      case "history":
      return super._onDrop(event);
      default:
        const t = event.target.closest(".equipment-drag-slot")
        if(!event.target.closest(".equipment-drag-slot")) return super._onDrop(event);
        const dragData = event.dataTransfer.getData("application/json");
        if ( !dragData ) return super._onDrop(event);
        const id = JSON.parse(dragData).id;
        const item = this.actor.items.find(i => i._id == id);
        this._onEquipItem(item);
    }
    return true;
  }

  async _onDropItem(event, data) {
    if ( !this.actor.isOwner ) return false;
    const item = await Item.implementation.fromDropData(data);
    if(!allowedItemTypes.includes(item.type)) {return false;}
    if(this.actor.items.some(i => i._id === item._id)) {return false;}

    return BreakItem.createDocuments([item], {pack: this.actor.pack, parent: this.actor, keepId: true});
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
    const button = event.target;
    const aptitudeId = button.dataset.id;
    this.actor.rollAptitude(aptitudeId)
  }

  static async #onModifyHearts(event) {
    event.preventDefault();
    const amount = event.target.dataset.amount;
    this.actor.modifyHp(+amount);
  }

  static async #onSelectFeature(event) {
    event.preventDefault();
    const featureType = event.target.dataset.type;

    new FeatureSelectionDialog({
      itemType: featureType,
      restricted: true,
      actor: this.document
    }).render(true);
  }

  static async #onSetTrait(event) {
    event.preventDefault();
    const button = event.target;
    const aptitude = button.parentElement.children[1].dataset.aptitude;
    const value = button.dataset.option;
    if(aptitude == undefined || value == undefined) {
      return;
    }
    this.actor.setAptitudeTrait(aptitude, +value)
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
    const { type } = button.dataset;
    const input = button.parentElement.querySelector("input");
    const min = input.min ? Number(input.min) : -Infinity;
    const max = input.max ? Number(input.max) : Infinity;
    let value = Number(input.value);
    if ( isNaN(value) ) return;
    value += type === "increase" ? 1 : -1;
    input.value = Math.min(Math.max(value, min), max);
    input.dispatchEvent(new Event("change"));
  }

  //#endregion

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
          const id = li.dataset?.id ?? li[0].currentTarget?.attributes?.getNamedItem("data-id")?.value;
          const item = this.document.items.get(id);
          this._onEquipItem(item);
        }
      },
      {
        name: "BREAK.SendToChat",
        icon: "<i class='fa-solid fa-fw fa-comment-alt'></i>",
        condition: () => item.isOwner,
        callback: li => this._onSendToChat(li)
      },
      {
        name: "BREAK.ContextMenuDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        condition: () => item.isOwner,
        callback: li => this._onDeleteItem(li)
      }
    ];

    return options;
  }

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

  _onItemRoll(event) {
    let button = $(event.currentTarget);
    const li = button.parents(".item");
    const item = this.actor.items.get(li.data("itemId"));
    let r = new Roll(button.data('roll'), this.actor.getRollData());
    return r.toMessage({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<h2>${item.name}</h2><h3>${button.text()}</h3>`
    });
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
