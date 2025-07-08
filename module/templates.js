/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function() {

  // Define template paths to load
  const templatePaths = [
    // Attribute list partial.
    "systems/break/templates/actors/shared/sheet-aptitudes.html",
    "systems/break/templates/actors/shared/sheet-identity.hbs",
    "systems/break/templates/actors/shared/sheet-combat.html",
    "systems/break/templates/actors/shared/sheet-abilities.html",
    "systems/break/templates/actors/shared/sheet-xp.html",
    "systems/break/templates/actors/shared/sheet-allegiance.html",
    "systems/break/templates/actors/shared/sheet-weapon-card.hbs",
    "systems/break/templates/actors/shared/sheet-equipment.hbs",
    "systems/break/templates/actors/shared/sheet-bag-content.hbs",
    "systems/break/templates/actors/shared/sheet-bags.hbs",
    "systems/break/templates/actors/adversary/parts/adversary-misc.hbs",
    "systems/break/templates/actors/adversary/parts/sheet-combat.html",
    "systems/break/templates/actors/adversary/parts/simplified-sheet-aptitudes.html",
    "systems/break/templates/rolls/roll-check.hbs",
    "systems/break/templates/rolls/roll-dialog.hbs",
    "systems/break/templates/items/shared/item-header.hbs",
    "systems/break/templates/items/shared/generic-header.hbs",
    "systems/break/templates/items/shared/item-abilities.hbs",
    "systems/break/templates/items/weapon/weapon-details.hbs",
    "systems/break/templates/items/armor/armor-details.hbs",
    "systems/break/templates/items/shield/shield-details.hbs",
    "systems/break/templates/items/calling/advancement-table.hbs",
    "systems/break/templates/actors/shared/sheet-equipment-card.hbs",
    "systems/break/templates/system/active-effects-panel.hbs"
  ];

  // Load the template parts
  return foundry.applications.handlebars.loadTemplates(templatePaths);
};