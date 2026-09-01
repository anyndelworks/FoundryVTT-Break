import BREAK from "../constants.js";

function defineActionEffectField(fields) {
    return new fields.ArrayField(new fields.SchemaField({
        id: new fields.StringField({ initial: "" }),
        type: new fields.StringField({ initial: "none" }),
        amount: new fields.NumberField({ initial: 0 }),
        macroUuid: new fields.StringField({ initial: "" }),
        macroName: new fields.StringField({ initial: "" }),
    }));
}

function defineActionData(fields) {
    return {
        name: new fields.StringField({ initial: "" }),
        rollType: new fields.StringField({ initial: "none" }),
        cost: new fields.StringField({ initial: "free" }),
        description: new fields.HTMLField({ initial: "" }),
        aptitude: new fields.StringField({ initial: "might", nullable: true }),
        vs: new fields.StringField({ initial: "might", nullable: true }),
        checkEffectTrigger: new fields.StringField({ initial: "success" }),
        target: new fields.StringField({ initial: "self" }),
        requiredItemRef: new fields.StringField({ initial: "" }),
        requiredItemName: new fields.StringField({ initial: "" }),
        requiredItemQuantity: new fields.NumberField({ initial: 1, min: 0 }),
        consumeItemRef: new fields.StringField({ initial: "" }),
        consumeItemName: new fields.StringField({ initial: "" }),
        consumeItemQuantity: new fields.NumberField({ initial: 1, min: 0 }),
        effectType: new fields.StringField({ initial: "none" }),
        effectAmount: new fields.NumberField({ initial: 0 }),
        effects: defineActionEffectField(fields),
        activeEffectRefs: new fields.ArrayField(new fields.StringField({ initial: "" })),
        activeEffects: new fields.ArrayField(new fields.ObjectField({})),
    };
}

export function defineActionField(fields) {
    return new fields.ArrayField(new fields.SchemaField({
        id: new fields.StringField({ initial: "" }),
        ...defineActionData(fields),
        rankVariants: new fields.ArrayField(new fields.SchemaField({
            id: new fields.StringField({ initial: "" }),
            minRank: new fields.NumberField({ initial: 2, min: 2, max: BREAK.max_rank, integer: true }),
            ...defineActionData(fields),
        })),
    }));
}
