export class QuirkDataModel extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            description: new fields.HTMLField({ initial: "" }),
            advantages: new fields.HTMLField({ initial: "" }),
            disadvantages: new fields.HTMLField({ initial: "" }),
            type: new fields.StringField({ initial: "" })
        };
    }
}