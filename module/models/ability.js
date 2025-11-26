export class AbilityDataModel extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            type: new fields.StringField({ initial: "calling" }),
            subtype: new fields.StringField({initial: "starting"}),
            description: new fields.HTMLField({ initial: "" }),
            rules: new fields.HTMLField({ initial: "" }),
            actions: new fields.ArrayField(new fields.ObjectField({
                id: new fields.StringField({ initial: "" }),
                name: new fields.StringField({ initial: "" }),
                rollType: new fields.StringField({ initial: "none" }),
                cost: new fields.StringField({ initial: "free" }),
                description: new fields.HTMLField({ initial: "" }),
                aptitude: new fields.StringField({ initial: "might" }),
                vs: new fields.StringField({ initial: "might" }),
            })),
            magic: new fields.BooleanField({ initial: false })
        };
    }
}