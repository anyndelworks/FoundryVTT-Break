export function defineActionField(fields) {
    return new fields.ArrayField(new fields.ObjectField({
        id: new fields.StringField({ initial: "" }),
        name: new fields.StringField({ initial: "" }),
        rollType: new fields.StringField({ initial: "none" }),
        cost: new fields.StringField({ initial: "free" }),
        description: new fields.HTMLField({ initial: "" }),
        aptitude: new fields.StringField({ initial: "might" }),
        vs: new fields.StringField({ initial: "might" }),
        target: new fields.StringField({ initial: "self" }),
        requiredItemRef: new fields.StringField({ initial: "" }),
        requiredItemName: new fields.StringField({ initial: "" }),
        requiredItemQuantity: new fields.NumberField({ initial: 1, min: 0 }),
        consumeItemRef: new fields.StringField({ initial: "" }),
        consumeItemName: new fields.StringField({ initial: "" }),
        consumeItemQuantity: new fields.NumberField({ initial: 1, min: 0 }),
        effectType: new fields.StringField({ initial: "none" }),
        effectAmount: new fields.NumberField({ initial: 0 }),
    }));
}
