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
            advancementTable: new fields.ArrayField(
                new fields.ObjectField({
                    attack: new fields.NumberField({ initial: 0 }),
                    hearts: new fields.NumberField({ initial: 0 }),
                    might: new fields.NumberField({ initial: 0 }),
                    deftness: new fields.NumberField({ initial: 0 }),
                    grit: new fields.NumberField({ initial: 0 }),
                    insight: new fields.NumberField({ initial: 0 }),
                    aura: new fields.NumberField({ initial: 0 }),
                    xp: new fields.NumberField({ initial: 0 }),
                }),
            ),
            armorAllowances: new fields.ArrayField(new fields.StringField()),
            shieldAllowances: new fields.ArrayField(new fields.StringField()),
            weaponAllowances: new fields.ArrayField(new fields.StringField()),
            abilities: new fields.ArrayField(new fields.StringField())
        };
    }
}