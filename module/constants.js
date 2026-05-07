export const RANK_XP = [0,6,12,24,36,48,72,96,132,168]

const BREAK = {}

BREAK.max_rank = 10;

BREAK.ability_types = {
    calling: "BREAK.Calling",
    species: "BREAK.Species",
    weapon: "BREAK.GEAR.TYPE.Weapon",
    armor: "BREAK.GEAR.TYPE.Armor",
    shield: "TYPES.Item.shield",
    adversary: "TYPES.Actor.adversary"
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

BREAK.adversary_ability_levels = {
    basic: "BREAK.ABILITIES.Basic",
    advanced: "BREAK.ABILITIES.Advanced",
    legendary: "BREAK.ABILITIES.Legendary"
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

BREAK.ammo_target_modes = {
    none: {
        key: "none",
        label: "BREAK.AMMO.TARGET.None"
    },
    target: {
        key: "target",
        label: "BREAK.AMMO.TARGET.Target"
    },
    area: {
        key: "area",
        label: "BREAK.AMMO.TARGET.Area"
    }
}

BREAK.ammo_attack_modifiers = {
    none: {
        key: "",
        label: "BREAK.None"
    },
    minorBonus: {
        key: "minorBonus",
        bonus: "2",
        label: "BREAK.MinorBonus"
    },
    majorBonus: {
        key: "majorBonus",
        bonus: "4",
        label: "BREAK.MajorBonus"
    },
    minorPenalty: {
        key: "minorPenalty",
        bonus: "-2",
        label: "BREAK.MinorPenalty"
    },
    majorPenalty: {
        key: "majorPenalty",
        bonus: "-4",
        label: "BREAK.MajorPenalty"
    },
    edge: {
        key: "edge",
        edge: "1",
        label: "BREAK.Edge"
    },
    snag: {
        key: "snag",
        edge: "2",
        label: "BREAK.Snag"
    }
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

BREAK.action_targets = {
    self: {
        key: "self",
        label: "BREAK.ACTION.TargetSelf"
    },
    target: {
        key: "target",
        label: "BREAK.ACTION.TargetSelected"
    }
}

BREAK.action_effects = {
    none: {
        key: "none",
        label: "BREAK.ACTION.EFFECT.None"
    },
    heal: {
        key: "heal",
        label: "BREAK.ACTION.EFFECT.Heal"
    },
    damage: {
        key: "damage",
        label: "BREAK.ACTION.EFFECT.Damage"
    },
    applyItemEffects: {
        key: "applyItemEffects",
        label: "BREAK.ACTION.EFFECT.ApplyItemEffects"
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
