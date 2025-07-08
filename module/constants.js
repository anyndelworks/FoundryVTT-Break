export const RANK_XP = [0,6,12,24,36,48,72,96,132,168]

const BREAK = {}

BREAK.max_rank = 10;

BREAK.ability_types = {
    calling: "BREAK.Calling",
    species: "BREAK.Species",
    weapon: "BREAK.GEAR.TYPE.Weapon",
    armor: "BREAK.GEAR.TYPE.Armor"
}

BREAK.ability_levels = {
    starting: "BREAK.ABILITIES.Starting",
    standard: "BREAK.ABILITIES.Standard",
    advanced: "BREAK.ABILITIES.Advanced"
}

BREAK.item_types = {
    wayfinding: "TYPES.Item.wayfinding",
    illumination: "TYPES.Item.illumination",
    kit: "TYPES.Item.kit",
    book: "TYPES.Item.book",
    consumable: "TYPES.Item.consumable",
    combustible: "TYPES.Item.combustible",
    miscellaneous: "TYPES.Item.miscellaneous",
    curiosity: "TYPES.Item.curiosity",
    otherworldly: "TYPES.Item.otherworld",
}

export default BREAK;
