import { BaseItemDataModel } from "./base-item.js";

export class GenericItemDataModel extends BaseItemDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
        ...super.defineSchema(),
        type: new fields.StringField({ initial: null, nullable: true }),
        uses: new fields.SchemaField({
            value: new fields.NumberField({ initial: 1 }),
            total: new fields.NumberField({ initial: 1 })
        })
        };
    }
}