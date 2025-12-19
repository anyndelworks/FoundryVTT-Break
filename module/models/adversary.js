import { BreakBaseActorDataModel } from "./base-actor.js";

export class BreakAdversaryDataModel extends BreakBaseActorDataModel {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),

            menace: new fields.StringField({ initial: "Mook" }),
            rank: new fields.NumberField({ initial: 1 }),
            description: new fields.HTMLField({ initial: "" }),

            size: new fields.StringField({ nullable: true, initial: null }),

            menace_type: new fields.SchemaField({
                value: new fields.StringField({ initial: "mook" }),
                label: new fields.StringField({ initial: "BREAK.MENACE.Menace_Type" })
            }),

            slots: new fields.NumberField({ initial: 0 }),

            misc: new fields.SchemaField({
                habitat: new fields.HTMLField({ initial: "" }),
                gearInfo: new fields.HTMLField({ initial: "" }),
                communication: new fields.HTMLField({ initial: "" }),
                tactics: new fields.HTMLField({ initial: "" }),
                indicators: new fields.HTMLField({ initial: "" }),
                rpNote: new fields.HTMLField({ initial: "" }),
                customization: new fields.HTMLField({ initial: "" }),
                yield: new fields.HTMLField({ initial: "" }),
                reskin: new fields.HTMLField({ initial: "" })
            })
        };
    }

    computeDerivedData(actor) {
        super.computeDerivedData(actor);
    }
}