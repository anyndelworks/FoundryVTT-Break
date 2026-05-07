import { BaseItemDataModel } from "./base-item.js";

export class AmmoDataModel extends BaseItemDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            weaponType: new fields.StringField({ initial: "" }),
            special: new fields.BooleanField({ initial: false }),
            attackModifier: new fields.StringField({ initial: "" }),
            damageModifier: new fields.NumberField({ initial: 0 }),
            targetMode: new fields.StringField({ initial: "target" }),
            check: new fields.SchemaField({
                enabled: new fields.BooleanField({ initial: false }),
                aptitude: new fields.StringField({ initial: "grit" }),
                modifier: new fields.StringField({ initial: "" })
            })
        };
    }
}
