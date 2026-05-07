import { BreakItem } from "../items/item.js";
import { BreakActorSheet } from "./actor-sheet.js";

const allowedItemTypes = ["ability", "accessory", "ammo", "armor", "otherworld", "outfit", "shield", "item", "weapon"]

export class BreakAdversarySheet extends BreakActorSheet {
  _viewOnly = true;

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    classes: ["break", "sheet", "actor", "adversary"],
    actions: {
      toggleEditable: this.#onToggleEditable
    }
  }

  static TABS = {
    primary: {
      initial: "combat",
      tabs: [{id: "combat", icon: "fas fa-sword"}, {id: "inventory", icon: "fas fa-sack"}, {id: "misc", icon: "fas fa-hood-cloak"}, {id:"notes", icon: "fas fa-scroll"}],
    }
  }

  static PARTS = {
    header: {
      template: "systems/break/templates/actors/adversary/parts/sheet-header.hbs"
    },
    tabs: {
      template: "systems/break/templates/shared/sheet-tabs.hbs",
    },
    combat: {
      template: "systems/break/templates/actors/adversary/parts/sheet-tab-combat.hbs",
      scrollable: [""]
    },
    inventory: {
      template: "systems/break/templates/actors/adversary/parts/sheet-tab-inventory.hbs",
      scrollable: ['']
    },
    misc: {
      template: "systems/break/templates/actors/adversary/parts/sheet-tab-misc.hbs",
      scrollable: ['']
    },
    notes: {
      template: "systems/break/templates/actors/adversary/parts/sheet-tab-notes.hbs",
      scrollable: ['']
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);
    this._toggleSheetControls(!context.editable);

    // Everything below here is only needed if the sheet is editable
    if ( !context.editable ) return;

    html.find("input.item-quantity").on("change", this._onChangeItemInput.bind(this));

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

    new foundry.applications.ux.ContextMenu.implementation(html[0], "[data-id]", [], { onOpen: this._onOpenContextMenu.bind(this), jQuery: false });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.habitatHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.misc.habitat, {secrets: this.document.isOwner,async: true});
    context.gearInfoHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.misc.gearInfo, {secrets: this.document.isOwner,async: true});
    context.communicationHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.misc.communication, {secrets: this.document.isOwner,async: true});
    context.tacticsHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.misc.tactics, {secrets: this.document.isOwner,async: true});
    context.indicatorsHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.misc.indicators, {secrets: this.document.isOwner,async: true});
    context.rpNoteHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.misc.rpNote, {secrets: this.document.isOwner,async: true});
    context.customizationHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.misc.customization, {secrets: this.document.isOwner,async: true});
    context.reskinHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.misc.reskin, {secrets: this.document.isOwner,async: true});
    context.yieldHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.misc.yield, {secrets: this.document.isOwner,async: true});
    context.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.notes, {secrets: this.document.isOwner,async: true});
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {secrets: this.document.isOwner,async: true});
    
    context.abilities = context.document.items.filter(i => i.type === "ability");

    if (context.document.system.equipment.armor && context.document.system.equipment.armor.system.speedLimit != null && context.document.system.equipment.armor.system.speedLimit != "") {
      context.speedRating = +context.document.system.equipment.armor.system.speedLimit < context.speedRating ? +context.document.system.equipment.armor.system.speedLimit : context.speedRating;
      context.speedRatingLabel = this.constructor.getSpeedRatingLabel(context.speedRating);
    }

    const sizes = this.getSizes();
    context.sizes = Object.keys(sizes).map(k => ({
      key: k,
      label: sizes[k].label,
      active: context.document.system.size.value === k
    }));

    context.defenseRating = context.document.system.defense.total;
    context.inventorySlots = context.document.system.slots.total;
    context.editable = this.isEditable && !this._viewOnly;
    return context;
  }
  //#endregion


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

  _onOpenContextMenu(element) {
    const item = this.document.items.get(element.dataset.id);
    if (!item || (item instanceof Promise)) return;

    item.equippable = element.dataset.equippable;
    ui.context.menuItems = this._getContextOptions(item);
  }

  _getContextOptions(item) {
    const options = [
      {
        label: "BREAK.Equip",
        icon: "<i class='fa-solid fa-shield'></i>",
        visible: () => item.equippable === 'true',
        onClick: (event, target) => {
          const id = target.dataset.id;
          const item = this.document.items.get(id);
          this._onEquipItem(item);
        }
      },
      {
        label: "BREAK.SendToChat",
        icon: "<i class='fa-solid fa-fw fa-comment-alt'></i>",
        visible: () => item.isOwner,
        onClick: (event, target) => this._onSendToChat(target)
      },
      {
        label: "BREAK.ContextMenuDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        visible: () => item.isOwner,
        onClick: (event, target) => this._onDeleteItem(target)
      }
    ];

    return options;
  }

  static #onToggleEditable(event) {
    event.preventDefault();
    this._viewOnly = !this._viewOnly;
    this.render(true);
  }
}
