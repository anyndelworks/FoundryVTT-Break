export class BaseItemDataModel extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            description: new fields.HTMLField({ initial: "" }),
            slots: new fields.NumberField({ initial: 1, min: 0 }),
            value: new fields.SchemaField({
                gems: new fields.NumberField({ initial: 0, min: 0 }),
                coins: new fields.NumberField({ initial: 0, min: 0 }),
                stones: new fields.NumberField({ initial: 0, min: 0 })
            }),
            quantity: new fields.NumberField({ initial: 1, min: 0 })
        };
    }
}