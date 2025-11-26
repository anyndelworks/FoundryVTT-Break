// Import Modules
import { BreakActor } from "./module/actors/actor.js";
import { BreakItem } from "./module/items/item.js";
import { preloadHandlebarsTemplates } from "./module/templates.js";
import { BreakToken, BreakTokenDocument } from "./module/token.js";
import { BreakCharacterSheet } from "./module/actors/character-sheet.js";
import { BreakAdversarySheet } from "./module/actors/adversary-sheet.js";
import {ArmorTypeSettingsForm} from "./module/system/armor-type-settings.js";
import {WeaponTypeSettingsForm} from "./module/system/weapon-type-settings.js";
import {ShieldTypeSettingsForm} from "./module/system/shield-type-settings.js";
import {SizeSettingsForm} from "./module/system/size-settings.js";
////// EQUIPMENT
import { BreakWeaponSheet } from "./module/items/weapon-sheet.js";
import { BreakArmorSheet } from "./module/items/armor-sheet.js";
import { BreakShieldSheet } from "./module/items/shield-sheet.js";
////// INVENTORY
import { BreakInjurySheet } from "./module/items/injury-sheet.js";
import { BreakAilmentSheet } from "./module/items/ailment-sheet.js";
import { ActiveEffectsPanel } from "./module/apps/active-effects-list.js";
import { BreakGiftSheet } from "./module/items/gift-sheet.js";
import { BreakOutfitSheet } from "./module/items/outfit-sheet.js";
import { BreakAccessorySheet } from "./module/items/accessory-sheet.js";
import { BreakGenericItemSheet } from "./module/items/generic-item-sheet.js";
////// STATUS
import { BreakCallingSheet } from "./module/items/calling-sheet.js";
import { BreakSpeciesSheet } from "./module/items/species-sheet.js";
import { BreakHomelandSheet } from "./module/items/homeland-sheet.js";
import { BreakHistorySheet } from "./module/items/history-sheet.js";
import { BreakQuirkSheet } from "./module/items/quirk-sheet.js";
import { BreakAbilitySheet } from "./module/items/ability-sheet.js";
////// MODELS
import { BreakCharacterDataModel } from "./module/models/character.js";
import { BreakGMCDataModel } from "./module/models/gmc.js";
import { BreakAdversaryDataModel } from "./module/models/adversary.js";
import { AccessoryDataModel } from './module/models/accessory.js';
import { ArmorDataModel } from './module/models/armor.js';
import { OutfitDataModel } from './module/models/outfit.js';
import { ShieldDataModel } from './module/models/shield.js';
import { GenericItemDataModel } from './module/models/item.js';
import { CallingDataModel } from './module/models/calling.js';
import { SpeciesDataModel } from './module/models/species.js';
import { HomelandDataModel } from './module/models/homeland.js';
import { HistoryDataModel } from './module/models/history.js';
import { QuirkDataModel } from './module/models/quirk.js';
import { AbilityDataModel } from './module/models/ability.js';
import { WeaponDataModel } from './module/models/weapon.js';
import { InjuryDataModel } from './module/models/injury.js';
import { AilmentDataModel } from './module/models/ailment.js';
import { MaterialDataModel } from './module/models/material.js';
import { AdditiveDataModel } from './module/models/additive.js';

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

const {Actors, Items} = foundry.documents.collections;

/**
 * Init hook.
 */
Hooks.once("init", async function() {
  /**
   * Set an initiative formula for the system. This will be updated later.
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 2
  };

  if (document.querySelector("#ui-top") !== null) {
    // Template element for effects-panel
    const uiTop = document.querySelector("#ui-top");
    const template = document.createElement("template");
    template.setAttribute("id", "break-active-effects-panel");
    uiTop?.insertAdjacentElement("afterend", template);
  }

  game.break = {
    BreakActor,
    activeEffectPanel: new ActiveEffectsPanel()
  };

  // Define custom Document classes
  CONFIG.Actor.dataModels["character"] = BreakCharacterDataModel;
  CONFIG.Actor.dataModels["gmc"] = BreakGMCDataModel;
  CONFIG.Actor.dataModels["adversary"] = BreakAdversaryDataModel;
  CONFIG.Actor.documentClass = BreakActor;
  CONFIG.Item.dataModels["accessory"] = AccessoryDataModel;
  CONFIG.Item.dataModels["armor"] = ArmorDataModel;
  CONFIG.Item.dataModels["item"] = GenericItemDataModel;
  CONFIG.Item.dataModels["outfit"] = OutfitDataModel;
  CONFIG.Item.dataModels["shield"] = ShieldDataModel;
  CONFIG.Item.dataModels["calling"] = CallingDataModel;
  CONFIG.Item.dataModels["species"] = SpeciesDataModel;
  CONFIG.Item.dataModels["homeland"] = HomelandDataModel;
  CONFIG.Item.dataModels["history"] = HistoryDataModel;
  CONFIG.Item.dataModels["quirk"] = QuirkDataModel;
  CONFIG.Item.dataModels["ability"] = AbilityDataModel;
  CONFIG.Item.dataModels["weapon"] = WeaponDataModel;
  CONFIG.Item.dataModels["injury"] = InjuryDataModel;
  CONFIG.Item.dataModels["ailment"] = AilmentDataModel;
  CONFIG.Item.dataModels["material"] = MaterialDataModel;
  CONFIG.Item.dataModels["additive"] = AdditiveDataModel;
  CONFIG.Item.documentClass = BreakItem;
  CONFIG.Token.documentClass = BreakTokenDocument;
  CONFIG.Token.objectClass = BreakToken;
  CONFIG.BREAK = CONFIG.BREAK || {};
  CONFIG.BREAK.armorTypes = {
    naked: {
      label: "Naked",
      defense: 0,
      speedLimit: 3,
      slots: 1,
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    light: {
      label: "Light",
      defense: 0,
      speedLimit: 3,
      slots: 1,
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    medium: {
      label: "Medium",
      defense: 0,
      speedLimit: 3,
      slots: 1,
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    heavy: {
      label: "Heavy",
      defense: 0,
      speedLimit: 3,
      slots: 1,
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    superheavy: {
      label: "Superheavy",
      defense: 0,
      speedLimit: 3,
      slots: 1,
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    }
  };

  game.settings.register("break", "armorTypes", {
    name: "Armor Types",
    scope: "world",
    config: false,
    type: Object,
    default: CONFIG.BREAK.armorTypes
  });

  game.settings.registerMenu("break", "armorTypeMenu", {
    name: "CONFIG.ArmorTypes",
    label: "CONFIG.ArmorTypeConfig",
    hint: "CONFIG.ArmorTypeConfigHint",
    icon: "fas fa-helmet-battle",
    type: ArmorTypeSettingsForm,
    restricted: true
  });

  CONFIG.BREAK.weaponTypes = {
    unarmed: {
      label: "Unarmed",
      ranged: false,
      extraDamage: 20,
      loadingTime: 1,
      hands: 1,
      slots: 0,
      range: 0,
      abilities: [],
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    standard: {
      label: "Standard",
      ranged: false,
      extraDamage: 20,
      loadingTime: 1,
      hands: 1,
      slots: 0,
      range: 0,
      abilities: [],
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    concealed: {
      label: "Concealed",
      ranged: false,
      extraDamage: 20,
      loadingTime: 1,
      hands: 1,
      slots: 0,
      range: 0,
      abilities: [],
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    quick: {
      label: "Quick",
      ranged: false,
      extraDamage: 20,
      loadingTime: 1,
      hands: 1,
      slots: 0,
      range: 0,
      abilities: [],
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    master: {
      label: "Master",
      ranged: false,
      extraDamage: 20,
      loadingTime: 1,
      hands: 1,
      slots: 0,
      range: 0,
      abilities: [],
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    mighty: {
      label: "Mighty",
      ranged: false,
      extraDamage: 20,
      loadingTime: 1,
      hands: 1,
      slots: 0,
      range: 0,
      abilities: [],
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    arc: {
      label: "Arc",
      ranged: false,
      extraDamage: 20,
      loadingTime: 1,
      hands: 1,
      slots: 0,
      range: 0,
      abilities: [],
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    lash: {
      label: "Lash",
      ranged: false,
      extraDamage: 20,
      loadingTime: 1,
      hands: 1,
      slots: 0,
      range: 0,
      abilities: [],
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    thrown: {
      label: "Thrown",
      ranged: false,
      extraDamage: 20,
      loadingTime: 1,
      hands: 1,
      slots: 0,
      range: 0,
      abilities: [],
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    drawn: {
      label: "Drawn",
      ranged: false,
      extraDamage: 20,
      loadingTime: 1,
      hands: 1,
      slots: 0,
      range: 0,
      abilities: [],
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    mechanicalSmall: {
      label: "Mechanical (Small)",
      ranged: false,
      extraDamage: 20,
      loadingTime: 1,
      hands: 1,
      slots: 0,
      range: 0,
      abilities: [],
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    mechanicalLarge: {
      label: "Mechanical (Large)",
      ranged: false,
      extraDamage: 20,
      loadingTime: 1,
      hands: 1,
      slots: 0,
      range: 0,
      abilities: [],
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    }
  };

  game.settings.register("break", "weaponTypes", {
    name: "Weapon Types",
    scope: "world",
    config: false,
    type: Object,
    default: CONFIG.BREAK.weaponTypes
  });

  game.settings.registerMenu("break", "weaponTypeMenu", {
    name: "CONFIG.WeaponTypes",
    label: "CONFIG.WeaponTypeConfig",
    hint: "CONFIG.WeaponTypeConfigHint",
    icon: "fas fa-sword",
    type: WeaponTypeSettingsForm,
    restricted: true
  });

  CONFIG.BREAK.shieldTypes = {
    small: {
      label: "Small",
      defense: 0,
      slots: 1,
      speedPenalty: 0,
      hands: 0,
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    standard: {
      label: "Standard",
      defense: 0,
      slots: 1,
      speedPenalty: 0,
      hands: 0,
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    },
    large: {
      label: "Large",
      defense: 0,
      slots: 1,
      speedPenalty: 0,
      hands: 0,
      value: {
        gems: 0,
        coins: 0,
        stones: 0
      }
    }
  };

  game.settings.register("break", "shieldTypes", {
    name: "Shield Types",
    scope: "world",
    config: false,
    type: Object,
    default: CONFIG.BREAK.shieldTypes
  });

  game.settings.registerMenu("break", "shieldTypeMenu", {
    name: "CONFIG.ShieldTypes",
    label: "CONFIG.ShieldTypeConfig",
    hint: "CONFIG.ShieldTypeConfigHint",
    icon: "fas fa-shield-alt",
    type: ShieldTypeSettingsForm,
    restricted: true
  });

  CONFIG.BREAK.sizes = {
    small: {
      label: "Small",
      inventorySize: 0,
      slots: 0,
      deftness: 0,
      might: 0,
      insight: 0,
      aura: 0,
      grit: 0,
      defense: 0
    },
    medium: {
      label: "Medium",
      inventorySize: 0,
      slots: 0,
      deftness: 0,
      might: 0,
      insight: 0,
      aura: 0,
      grit: 0,
      defense: 0
    },
    large: {
      label: "Large",
      inventorySize: 0,
      slots: 0,
      deftness: 0,
      might: 0,
      insight: 0,
      aura: 0,
      grit: 0,
      defense: 0
    }
  }

  game.settings.register("break", "sizes", {
    name: "Sizes",
    scope: "world",
    config: false,
    type: Object,
    default: CONFIG.BREAK.sizes
  });

  game.settings.registerMenu("break", "sizesMenu", {
    name: "CONFIG.Sizes",
    label: "CONFIG.SizesConfig",
    hint: "CONFIG.SizesConfigHint",
    icon: "fas fa-hood-cloak",
    type: SizeSettingsForm,
    restricted: true
  });

  // Register sheet application classes
  Actors.unregisterSheet("core", foundry.applications.sheets.ActorSheetV2);
  Actors.registerSheet("break", BreakCharacterSheet, {types:['character'], makeDefault: true });
  Actors.registerSheet("break", BreakAdversarySheet, {types:['adversary'], makeDefault: true });
  Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
/////// EQUIPMENT
  Items.registerSheet("break", BreakWeaponSheet, {types:['weapon'], makeDefault: true });
  Items.registerSheet("break", BreakArmorSheet, {types:['armor'], makeDefault: true });
  Items.registerSheet("break", BreakShieldSheet, { types: ['shield'], makeDefault: true });
/////// INVENTORY
  Items.registerSheet("break", BreakGenericItemSheet, { types: ['item'], makeDefault: true });
  Items.registerSheet("break", BreakOutfitSheet, { types: ['outfit'], makeDefault: true });
  Items.registerSheet("break", BreakAccessorySheet, { types: ['accessory'], makeDefault: true });
/////// STATUS
  Items.registerSheet("break", BreakGiftSheet, { types: ['gift'], makeDefault: true });
  Items.registerSheet("break", BreakInjurySheet, {types:['injury'], makeDefault: true });
  Items.registerSheet("break", BreakAilmentSheet, {types:['ailment'], makeDefault: true });
  Items.registerSheet("break", BreakCallingSheet, {types:['calling'], makeDefault: true });
  Items.registerSheet("break", BreakSpeciesSheet, {types:['species'], makeDefault: true });
  Items.registerSheet("break", BreakHomelandSheet, {types:['homeland'], makeDefault: true });
  Items.registerSheet("break", BreakHistorySheet, {types:['history'], makeDefault: true });
  Items.registerSheet("break", BreakQuirkSheet, { types: ['quirk'], makeDefault: true });
  Items.registerSheet("break", BreakAbilitySheet, {types:['ability'], makeDefault: true });

  /**
   * Slugify a string.
   */
  Handlebars.registerHelper('slugify', function(value) {
    return value.slugify({strict: true});
  });

  Handlebars.registerHelper('sum', function(value1, value2, value3) {
    return value1+value2+value3
  });

  Handlebars.registerHelper('mul', function(value1, value2, options) {
    const result = value1 * value2;

    // If a precision option is passed, round the result
    const precision = options.hash.precision || 10; // default to 10 decimal places if not provided
    const factor = Math.pow(10, precision);

    // Round the result to the specified precision
    return Math.round(result * factor) / factor;
  });

  Handlebars.registerHelper('for', function(from, to, incr, block) {
    var accum = '';
    for(var i = from; i < to; i += incr)
        accum += block.fn(i);
    return accum;
  });

  Handlebars.registerHelper("when", (operand_1, operator, operand_2, options) => {
    let operators = {                     //  {{#when <operand1> 'eq' <operand2>}}
      'eq': (l,r) => l == r,              //  {{/when}}
      'noteq': (l,r) => l != r,
      'gt': (l,r) => (+l) > (+r),                        // {{#when var1 'eq' var2}}
      'gteq': (l,r) => ((+l) > (+r)) || (l == r),        //               eq
      'lt': (l,r) => (+l) < (+r),                        // {{else when var1 'gt' var2}}
      'lteq': (l,r) => ((+l) < (+r)) || (l == r),        //               gt
      'or': (l,r) => l || r,                             // {{else}}
      'and': (l,r) => l && r,                            //               lt
      '%': (l,r) => (l % r) === 0                        // {{/when}}
    }
    let result = operators[operator](operand_1,operand_2);
    if(result) return options.fn(options.data.root);
    return options.inverse(this);       
  });

  Handlebars.registerHelper('times', function(n, block) {
    let accum = '';
    for (let i = 0; i < n; ++i) {
      accum += block.fn(i);
    }
    return accum;
  });

  // Preload template partials
  await preloadHandlebarsTemplates();
});


Hooks.once('canvasInit', (canvas) => {
  game.break.activeEffectPanel.render(true);
  Hooks.on("dropCanvasData", (canvas, dropData) => {
    if ( dropData.type === 'Item') {
      const item = game.items.get(dropData.uuid.split('.')[1]);
      const dropTarget = [...canvas.tokens.placeables]
        .sort((a, b) => b.document.sort - a.document.sort)
        .sort((a, b) => b.document.elevation - a.document.elevation)
        .find((t) => t.bounds.contains(dropData.x, dropData.y));
      const actor = dropTarget?.actor;
      if(actor && (item.type == "injury" || item.type == "ailment")) {
        item.effects.forEach(async (effect) => {
          const newEffect = ActiveEffect.create({...effect}, {parent: actor});
        });
      }
    }
  });
});

Hooks.on("createItem", (item) => {
  const parent = item.parent;
  if (!(parent instanceof Actor)) return;
  if (item.documentName !== "Item") return;
  parent.onEmbedItem(item);
});

//Fix issue where if you use Enter key in a input it trigger a click on the next button
window.addEventListener('keydown', function (e) {
  if (e.keyIdentifier == 'U+000A' || e.keyIdentifier == 'Enter' || e.keyCode == 13) {
    if (e.target.nodeName == 'INPUT' && (e.target.type == 'text' || e.target.type == 'number')) {
      e.preventDefault();

      return false;
    }
  }
}, true);