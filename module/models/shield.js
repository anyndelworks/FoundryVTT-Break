import { BaseItemDataModel } from "./base-item.js";

export class ShieldDataModel extends BaseItemDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            defenseBonus: new fields.NumberField({ initial: 0 }),
            speedPenalty: new fields.NumberField({ initial: 0 }),
            type: new fields.StringField({ initial: "small" }),
            abilities: new fields.ArrayField(new fields.StringField()),
            hands: new fields.NumberField({ initial: 1 })
        };
    }
}