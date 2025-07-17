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

    context.species = context.document.items.find(i => i.type === "species");
    context.hasSpecies = context.species != null;

    const sizes = this.getSizes();
    const size = context.document.system.size?.modifier ?? (context.hasSpecies ? context.species.system.size : null);
    if(size) {
      context.inventorySlots = sizes[size].inventorySize;
    }
    context.size = sizes[size];
    

    context.calling = context.document.items.find(i => i.type === "calling");
    context.hasCalling = context.calling != null;
    
    if (context.hasCalling && context.calling.system.advancementTable?.length > 0) {
      const stats = context.calling.system.advancementTable[context.rank - 1];

      context.document.system.aptitudes.might.value = stats.might;
      context.document.system.aptitudes.deftness.value = stats.deftness;
      context.document.system.aptitudes.grit.value = stats.grit;
      context.document.system.aptitudes.insight.value = stats.insight;
      context.document.system.aptitudes.aura.value = stats.aura;

      context.document.system.attack.value = stats.attack;
      context.document.system.hearts.max = stats.hearts;

      context.document.system.defense.value = context.calling.system.baseDefense;
      context.document.system.speed.value = context.calling.system.baseSpeed;
    }

    context.homeland = context.document.items.find(i => i.type === "homeland");
    context.hasHomeland = context.homeland != null;

    context.history = context.document.items.find(i => i.type === "history");
    context.hasHistory = context.history != null;

    context.abilities = context.document.items.filter(i => i.type === "ability");
    context.gifts = context.document.items.filter(i => i.type === "gift");
    context.quirks = context.document.items.filter(i => i.type === "quirk");

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

    context.document.system.purviews = context.document.system.purviews.replaceAll("\n", "&#10;")
    const armor = context.document.system.equipment.armor;
    const defense = context.document.system.defense;
    const aptitudes = context.document.system.aptitudes;
    const shield = context.document.system.equipment.shield;

    defense.bon = (size ? +sizes[size].defense : 0) + (shield ? shield.system.defenseBonus : 0) + (armor ? +armor.system.defenseBonus : 0) + (context.speedRating == 2 ? 2 : +context.speedRating >= 3 ? 4 : 0) + (defense.modifier ?? 0);
    context.defenseRating = defense.value + defense.bon;
    aptitudes.might.bon = (size ? +sizes[size].might : 0) + (aptitudes.might.modifier ?? 0);
    aptitudes.might.total = aptitudes.might.value + aptitudes.might.bon + aptitudes.might.trait;
    aptitudes.deftness.bon = (size ? +sizes[size].deftness : 0) + (aptitudes.deftness.modifier ?? 0);
    aptitudes.deftness.total = aptitudes.deftness.value + aptitudes.deftness.bon + aptitudes.deftness.trait;
    aptitudes.grit.bon = (size ? +sizes[size].grit : 0) + (aptitudes.grit.modifier ?? 0);
    aptitudes.grit.total = aptitudes.grit.value + aptitudes.grit.bon + aptitudes.grit.trait;
    aptitudes.insight.bon = (size ? +sizes[size].insight : 0) + (aptitudes.insight.modifier ?? 0);
    aptitudes.insight.total = aptitudes.insight.value + aptitudes.insight.bon + aptitudes.insight.trait;
    aptitudes.aura.bon = (size ? +sizes[size].aura : 0) + (aptitudes.aura.modifier ?? 0);
    aptitudes.aura.total = aptitudes.aura.value + aptitudes.aura.bon + aptitudes.aura.trait;
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
      case "species":
      case "homeland":
      case "history":
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
    if(featureType === "history" && homeland) {
      predefinedList = await Promise.all(homeland.system.histories.map(async (id) => await fromUuid(id)));
      predefinedList.forEach(history => {
        history.from = homeland.name;
      });
    } else if(featureType === "quirk" && species && species.system.quirkCategories) {
      filters = [i => species.system.quirkCategories.includes(i.system.type ?? "")];
    }
    new FeatureSelectionDialog({
      itemType: featureType,
      restricted: true,
      actor: this.document,
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
