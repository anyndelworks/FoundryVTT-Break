export class CallingDataModel extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            name: new fields.StringField({ initial: "" }),
            description: new fields.HTMLField({ initial: "" }),
            overview: new fields.HTMLField({ initial: "" }),
            baseSpeed: new fields.NumberField({ initial: 1 }),
            baseDefense: new fields.NumberField({ initial: 0 }),
            startingAbilities: new fields.ArrayField(new fields.StringField()),
            advancementTable: new fields.ObjectField({ initial: null, nullable: true }),
            armorAllowances: new fields.ArrayField(new fields.StringField()),
            shieldAllowances: new fields.ArrayField(new fields.StringField()),
            weaponAllowances: new fields.ArrayField(new fields.StringField()),
            abilities: new fields.ArrayField(new fields.StringField())
        };
    }
}