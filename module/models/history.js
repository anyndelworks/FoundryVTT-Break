import { normalizeHistoryOptions } from "../../utils/history-options.mjs";

export class HistoryDataModel extends foundry.abstract.DataModel {
    static migrateData(source) {
        source = super.migrateData(source);
        source.startingGear = normalizeHistoryOptions(source.startingGear);
        return source;
    }
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            name: new fields.StringField({ initial: "" }),
            description: new fields.HTMLField({ initial: "" }),
            purviews: new fields.ArrayField(new fields.StringField()),
            gearPicks: new fields.NumberField({ initial: 2, min: 0, integer: true }),
            startingGear: new fields.ArrayField(new fields.ObjectField())
        };
    }
}
