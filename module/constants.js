export const RANK_XP = [0,6,12,24,36,48,72,96,132,168]

const BREAK = {}

BREAK.max_rank = 10;

BREAK.ability_types = {
    calling: "BREAK.Calling",
    species: "BREAK.Species",
    weapon: "BREAK.GEAR.TYPE.Weapon",
    armor: "BREAK.GEAR.TYPE.Armor",
    shield: "TYPES.Item.shield"
}

BREAK.ability_levels = {
    starting: "BREAK.ABILITIES.Starting",
    standard: "BREAK.ABILITIES.Standard",
    advanced: "BREAK.ABILITIES.Advanced"
}

BREAK.species_ability_levels = {
    innate: "BREAK.Innate",
    maturative: "BREAK.Maturative"
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
    material: "TYPES.Item.material",
    additive: "TYPES.Item.additive"
}

BREAK.quirk_categories = {
    spirit: "BREAK.QUIRKS.CATEGORIES.Spirit",
    physiology: "BREAK.QUIRKS.CATEGORIES.Physiology",
    fate: "BREAK.QUIRKS.CATEGORIES.Fate",
    eldritch: "BREAK.QUIRKS.CATEGORIES.Eldritch",
    robotic: "BREAK.QUIRKS.CATEGORIES.Robotic"
}

BREAK.roll_types = {
    none: {
        label: "BREAK.NoRoll",
        key: "none"
    },
    attack: {
        label: "BREAK.Attack",
        key: "attack"
    },
    check: {
        label: "BREAK.Check",
        key: "check"
    },
    contest: {
        label: "BREAK.Contest",
        key: "contest"
    }
}

BREAK.action_costs = {
    free: {
        key: "free",
        label: "BREAK.Free"
    },
    action: {
        key: "action",
        label: "BREAK.Action"
    }
}

BREAK.aptitudes = {
    might: {
        key: "might",
        label: "BREAK.APTITUDE.Might"
    },
    deftness: {
        key: "deftness",
        label: "BREAK.APTITUDE.Deftness"
    },
    grit: {
        key: "grit",
        label: "BREAK.APTITUDE.Grit"
    },
    insight: {
        key: "insight",
        label: "BREAK.APTITUDE.Insight"
    },
    aura: {
        key: "aura",
        label: "BREAK.APTITUDE.Aura"
    }
}

export default BREAK;
