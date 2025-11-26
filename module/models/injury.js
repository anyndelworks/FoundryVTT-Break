export class InjuryDataModel extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            description: new fields.HTMLField({ initial: "" }),
            duration: new fields.SchemaField({
                value: new fields.NumberField({ initial: 1 }),
                permanent: new fields.BooleanField({ initial: false })
            })
        };
    }
}