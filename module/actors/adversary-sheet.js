import { BreakItem } from "../items/item.js";
import { BreakActorSheet } from "./actor-sheet.js";

const allowedItemTypes = ["ability", "accessory", "armor", "otherworld", "outfit", "shield", "item", "weapon"]

export class BreakAdversarySheet extends BreakActorSheet {
  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    classes: ["break", "sheet", "actor", "adversary"],
    actions: {

    }
  }

  static TABS = {
    primary: {
      initial: "combat",
      tabs: [{id: "combat", icon: "fas fa-sword"}, {id: "inventory", icon: "fas fa-sack"}, {id: "misc", icon: "fas fa-hood-cloak"}, {id:"notes", icon: "fas fa-scroll"}],
    }
  }

  static PARTS = {
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

    // Everything below here is only needed if the sheet is editable
    if ( !this.isEditable ) return;

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
    context.abilities = context.document.items.filter(i => i.type === "ability");

    if (context.document.system.equipment.armor && context.document.system.equipment.armor.system.speedLimit != null && context.document.system.equipment.armor.system.speedLimit != "") {
      context.speedRating = +context.document.system.equipment.armor.system.speedLimit < context.speedRating ? +context.document.system.equipment.armor.system.speedLimit : context.speedRating;
    }

    const sizes = this.getSizes();
    context.sizes = Object.keys(sizes).map(k => ({
      key: k,
      label: sizes[k].label,
      active: context.document.system.size === k
    }));

    const size = context.document.system.size ? sizes[context.document.system.size] : null;

    const aptitudes = context.document.system.aptitudes;
    aptitudes.might.bon = (size ? +size.might : 0) + (aptitudes.might.modifiers ?? 0);
    aptitudes.might.total = aptitudes.might.value + aptitudes.might.bon + aptitudes.might.trait;
    aptitudes.deftness.bon = (size ? +size.deftness : 0) + (aptitudes.deftness.modifiers ?? 0);
    aptitudes.deftness.total = aptitudes.deftness.value + aptitudes.deftness.bon + aptitudes.deftness.trait;
    aptitudes.grit.bon = (size ? +size.grit : 0) + (aptitudes.grit.modifiers ?? 0);
    aptitudes.grit.total = aptitudes.grit.value + aptitudes.grit.bon + aptitudes.grit.trait;
    aptitudes.insight.bon = (size ? +size.insight : 0) + (aptitudes.insight.modifiers ?? 0);
    aptitudes.insight.total = aptitudes.insight.value + aptitudes.insight.bon + aptitudes.insight.trait;
    aptitudes.aura.bon = (size ? +size.aura : 0) + (aptitudes.aura.modifiers ?? 0);
    aptitudes.aura.total = aptitudes.aura.value + aptitudes.aura.bon + aptitudes.aura.trait;

    //Fix line break issue with textarea input
    context.document.system.misc.habitat = context.document.system.misc.habitat.replaceAll("\n", "&#10;")
    context.document.system.misc.gearInfo = context.document.system.misc.gearInfo.replaceAll("\n", "&#10;")
    context.document.system.misc.communication = context.document.system.misc.communication.replaceAll("\n", "&#10;")
    context.document.system.misc.tactics = context.document.system.misc.tactics.replaceAll("\n", "&#10;")
    context.document.system.misc.indicators = context.document.system.misc.indicators.replaceAll("\n", "&#10;")
    context.document.system.misc.rpNote = context.document.system.misc.rpNote.replaceAll("\n", "&#10;")
    context.document.system.misc.customization = context.document.system.misc.customization.replaceAll("\n", "&#10;")
    context.document.system.misc.yield = context.document.system.misc.yield.replaceAll("\n", "&#10;")
    context.document.system.misc.reskin = context.document.system.misc.reskin.replaceAll("\n", "&#10;")
    const armor = context.document.system.equipment.armor;
    const defense = context.document.system.defense;
    defense.bon = (size ? +size.defense : 0) + (armor ? +armor.system.defenseBonus : 0) + (context.speedRating == 2 ? 2 : +context.speedRating >= 3 ? 4 : 0) + (defense.modifiers ?? 0);
    context.defenseRating = defense.value + defense.bon;
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
        name: "BREAK.Equip",
        icon: "<i class='fa-solid fa-shield'></i>",
        condition: () => item.equippable === 'true',
        callback: li => {
          const id = li.dataset?.id ?? li.target?.attributes?.getNamedItem("data-id")?.value;
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

}
