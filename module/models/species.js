export class SpeciesDataModel extends foundry.abstract.DataModel {
    static LEGACY_SIZE_VALUES = {
        tiny: 0,
        small: 1,
        medium: 2,
        large: 3,
        massive: 4,
        colossal: 5
    };

    static migrateData(source) {
        source = super.migrateData(source);
        if (typeof source.size === "string") {
            source.size = source.size === "" ? null : SpeciesDataModel.LEGACY_SIZE_VALUES[source.size] ?? Number(source.size);
            if (!Number.isFinite(source.size)) source.size = null;
        }
        return source;
    }

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            name: new fields.StringField({ initial: "" }),
            description: new fields.HTMLField({ initial: "" }),
            overview: new fields.HTMLField({ initial: "" }),
            size: new fields.NumberField({ initial: null, nullable: true, integer: true }),
            innateAbilities: new fields.ArrayField(new fields.StringField()),
            maturativeAbilities: new fields.ArrayField(new fields.StringField()),
            quirkCategories: new fields.ArrayField(new fields.StringField()),
            abilities: new fields.ArrayField(new fields.StringField())
        };
    }
}