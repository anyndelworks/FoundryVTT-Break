import { defineActionField } from "../system/action-schema.js";

export class AbilityDataModel extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            type: new fields.StringField({ initial: "calling" }),
            subtype: new fields.StringField({initial: "starting"}),
            description: new fields.HTMLField({ initial: "" }),
            rules: new fields.HTMLField({ initial: "" }),
            actions: defineActionField(fields),
            magic: new fields.BooleanField({ initial: false })
        };
    }
}