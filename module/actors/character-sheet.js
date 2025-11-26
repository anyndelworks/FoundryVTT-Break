import { RANK_XP} from "../constants.js";
import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";
import { BreakActorSheet } from "./actor-sheet.js";

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
  "homeland",
  "history",
  "quirk",
  "ability",
  "gift",
]

export class BreakCharacterSheet extends BreakActorSheet {

  freeHands;

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
    actions: {
      selectFeature: this.#onSelectFeature,
      setTrait: this.#onSetTrait,
      addPurview: this.#addPurview,
      deletePurview: this.#deletePurview,
    },
    form: {
      handler: BreakCharacterSheet.#onSubmit,
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
      template: "systems/break/templates/shared/sheet-tabs.hbs",
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
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.biographyHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.biography, {
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

    context.homeland = context.document.items.find(i => i.type === "homeland");
    context.hasHomeland = context.homeland != null;

    context.history = context.document.items.find(i => i.type === "history");
    context.hasHistory = context.history != null;

    context.abilities = context.document.items.filter(i => i.type === "ability");
    context.gifts = context.document.items.filter(i => i.type === "gift");
    context.quirks = context.document.items.filter(i => i.type === "quirk");

    context.calling = context.document.items.find(i => i.type === "calling");
    context.hasCalling = context.document.system.hasCalling;

    context.hasSpecies = context.document.system.hasSpecies;
    context.species = context.document.items.find(i => i.type === "species");
    context.size = context.document.system.sizeData;

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

    context.purviews = context.document.system.purviews ?? [];
    context.inventorySlots = context.document.system.inventorySlots;

    const defense = context.document.system.defense;
    context.defenseRating = defense.total;
    console.log(context)
    return context;
  }
  //#endregion

  //#region Drag&Drop
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if(data.type !== "Item") return;
    const draggedItem = await fromUuid(data.uuid);
    if(!allowedItemTypes.includes(draggedItem.type)) return;
    
    switch(draggedItem.type) {
      case "weapon":
      case "armor":
      case "outfit":
      case "accessory":
      case "shield":
        await super._onDrop(event);
        const newItem = this.actor.items.contents.at(-1);
        newItem.effects?.forEach(effect => {
          effect.update({disabled: true});
        });
        return;
      case "calling":
        const calling = this.actor.items.find(i => i.type === "calling");
        if(calling)
          return;
      case "species":
        const species = this.actor.items.find(i => i.type === "species");
        if(species)
          return;
      case "homeland":
        const homeland = this.actor.items.find(i => i.type === "homeland");
        if(homeland)
          return;
      case "history":
        const history = this.actor.items.find(i => i.type === "history");
        if(history)
          return;
      case "ability":
      default:
        await super._onDrop(event);
        return;
    }
  }
  //#endregion

  //#region Actions
  static async #onSelectFeature(event) {
    event.preventDefault();
    const featureType = event.target.dataset.type;
    let predefinedList = null;
    let filters = [];
    const homeland = this.actor.items.find(i => i.type === "homeland");
    const species = this.actor.items.find(i => i.type === "species");
    const calling = this.actor.items.find(i => i.type === "calling");
    if(featureType === "history" && homeland) {
      predefinedList = await Promise.all(homeland.system.histories.map(async (id) => await fromUuid(id)));
      predefinedList.forEach(history => {
        history.from = homeland.name;
      });
    } else if(featureType === "quirk" && species && species.system.quirkCategories) {
      filters = [i => species.system.quirkCategories.includes(i.system.type ?? "")];
    } else if(featureType === "ability") {
      filters = [a => a.system.type === "calling" || a.system.type === "species"];
      if(calling) {
        filters.push(i => calling.system.abilities?.includes(i.uuid) || i.system.type === "species");
      }
      if(species) {
        filters.push(i => species.system.abilities?.includes(i.uuid) || i.system.type === "calling")
      }
    }
    filters.push(i => !this.actor.items.find(it => it.uuid === i.uuid));
    new FeatureSelectionDialog({
      itemType: featureType,
      document: this.document,
      predefinedList,
      filters
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

  static async #onSubmit(event, form, formData) {
    event.preventDefault();
    const updateData = foundry.utils.expandObject(formData.object);
    const purviews = Object.keys(updateData.system.purviews ?? {}).map((k) => {
        return updateData.system.purviews[k];
    });
    updateData.system.purviews = purviews;
    await this.actor.update(updateData);
  }

  static #addPurview() {
    const purviews = [...this.actor.system.purviews];
    purviews.push("");
    this.actor.update({"system.purviews": purviews});
  }

  static #deletePurview(event) {
    event.preventDefault();
    const button = event.target;
    const index = Number(button.dataset.index);
    const purviews = [...this.actor.system.purviews];
    purviews.splice(index, 1);
    this.actor.update({"system.purviews": purviews});
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
}
