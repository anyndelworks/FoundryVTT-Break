export class AbilityDataModel extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            type: new fields.StringField({ initial: "" }),
            level: new fields.StringField({ initial: "" }),
            description: new fields.HTMLField({ initial: "" }),
            rules: new fields.HTMLField({ initial: "" }),
            actions: new fields.ArrayField(new fields.ObjectField()),
            magic: new fields.BooleanField({ initial: false })
        };
    }
}