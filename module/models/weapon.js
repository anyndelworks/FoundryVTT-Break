import { BaseItemDataModel } from "./base-item.js";

export class WeaponDataModel extends BaseItemDataModel {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            extraDamage: new fields.NumberField({ initial: 0 }),
            rangedExtraDamage: new fields.NumberField({ initial: 0 }),
            attackBonus: new fields.NumberField({ initial: 0 }),
            rangedAttackBonus: new fields.NumberField({ initial: 0 }),
            range: new fields.NumberField({ initial: 0 }),
            loadingTime: new fields.NumberField({ initial: 0 }),
            weaponType1: new fields.StringField({ initial: "unarmed" }),
            weaponType2: new fields.StringField({ initial: "" }),
            abilities: new fields.ArrayField(new fields.StringField()),
            hands: new fields.NumberField({ initial: 1 }),
            ranged: new fields.BooleanField({ initial: false }),
            melee: new fields.BooleanField({ initial: true }),
            actions: new fields.ArrayField(new fields.ObjectField({
                id: new fields.StringField({ initial: "" }),
                name: new fields.StringField({ initial: "" }),
                rollType: new fields.StringField({ initial: "none" }),
                cost: new fields.StringField({ initial: "free" }),
                description: new fields.HTMLField({ initial: "" }),
                aptitude: new fields.StringField({ initial: "might" }),
                vs: new fields.StringField({ initial: "might" }),
            })),
        };
    }
}