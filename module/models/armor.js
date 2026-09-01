import { BaseItemDataModel } from "./base-item.js";
import { ContainerCapableMixin } from "./container-capable.js";

export class ArmorDataModel extends ContainerCapableMixin(BaseItemDataModel) {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            defenseBonus: new fields.NumberField({ initial: 0 }),
            speedLimit: new fields.NumberField({ initial: 3 }),
            type: new fields.StringField({ initial: "naked" }),
            abilities: new fields.ArrayField(new fields.StringField())
        };
    }
}
