export class SpeciesDataModel extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            name: new fields.StringField({ initial: "" }),
            description: new fields.HTMLField({ initial: "" }),
            overview: new fields.HTMLField({ initial: "" }),
            size: new fields.StringField({ initial: null, nullable: true }),
            innateAbilities: new fields.ArrayField(new fields.StringField()),
            maturativeAbilities: new fields.ArrayField(new fields.StringField()),
            quirkCategories: new fields.ArrayField(new fields.StringField()),
            abilities: new fields.ArrayField(new fields.StringField())
        };
    }
}