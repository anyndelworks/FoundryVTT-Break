export class HistoryDataModel extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            name: new fields.StringField({ initial: "" }),
            description: new fields.HTMLField({ initial: "" }),
            purviews: new fields.ArrayField(new fields.StringField()),
            gearPicks: new fields.NumberField({ initial: 2 }),
            startingGear: new fields.ArrayField(new fields.ObjectField())
        };
    }
}