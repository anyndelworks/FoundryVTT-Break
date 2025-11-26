export class HomelandDataModel extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            name: new fields.StringField({ initial: "" }),
            description: new fields.HTMLField({ initial: "" }),
            bonusLanguages: new fields.StringField({ initial: "" }),
            histories: new fields.ArrayField(new fields.StringField())
        };
    }
}