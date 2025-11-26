export class BreakBaseActorDataModel extends foundry.abstract.DataModel {

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            attack: new fields.SchemaField({
                value: new fields.NumberField({ initial: 0 }),
                bon: new fields.NumberField({ initial: 0 }),
                total: new fields.NumberField({ initial: 0 }),
                modifier: new fields.NumberField({ initial: 0 })
            }),

            defense: new fields.SchemaField({
                value: new fields.NumberField({ initial: 0 }),
                bon: new fields.NumberField({ initial: 0 }),
                total: new fields.NumberField({ initial: 0 }),
                modifier: new fields.NumberField({ initial: 0 })
            }),

            speed: new fields.SchemaField({
                value: new fields.NumberField({ initial: 1 }),
                bon: new fields.NumberField({ initial: 0 }),
                total: new fields.NumberField({ initial: 1 }),
                modifier: new fields.NumberField({ initial: 0 })
            }),

            hearts: new fields.SchemaField({
                value: new fields.NumberField({ initial: 0 }),
                max: new fields.NumberField({ initial: 0 }),
                bon: new fields.NumberField({ initial: 0 }),
                total: new fields.NumberField({ initial: 0 }),
                modifier: new fields.NumberField({ initial: 0 })
            }),

            hands: new fields.SchemaField({
                value: new fields.NumberField({ initial: 2 }),
                bon: new fields.NumberField({ initial: 0 }),
                total: new fields.NumberField({ initial: 2 }),
                modifier: new fields.NumberField({ initial: 0 })
            }),

            aptitudes: new fields.SchemaField({
                might: new fields.SchemaField({
                    value: new fields.NumberField({ initial: 10 }),
                    bon: new fields.NumberField({ initial: 0 }),
                    trait: new fields.NumberField({ initial: 0 }),
                    total: new fields.NumberField({ initial: 10 }),
                    description: new fields.StringField({ initial: "BREAK.APTITUDE.MightDesc" }),
                    label: new fields.StringField({ initial: "BREAK.APTITUDE.Might" }),
                    color: new fields.StringField({ initial: "rgb(238, 61, 52) !important" }),
                    modifier: new fields.NumberField({ initial: 0 })
                }),
                deftness: new fields.SchemaField({
                    value: new fields.NumberField({ initial: 10 }),
                    bon: new fields.NumberField({ initial: 0 }),
                    trait: new fields.NumberField({ initial: 0 }),
                    total: new fields.NumberField({ initial: 10 }),
                    description: new fields.StringField({ initial: "BREAK.APTITUDE.DeftnessDesc" }),
                    label: new fields.StringField({ initial: "BREAK.APTITUDE.Deftness" }),
                    color: new fields.StringField({ initial: "rgb(244, 127, 38) !important;" }),
                    modifier: new fields.NumberField({ initial: 0 })
                }),
                grit: new fields.SchemaField({
                    value: new fields.NumberField({ initial: 10 }),
                    bon: new fields.NumberField({ initial: 0 }),
                    trait: new fields.NumberField({ initial: 0 }),
                    total: new fields.NumberField({ initial: 10 }),
                    description: new fields.StringField({ initial: "BREAK.APTITUDE.GritDesc" }),
                    label: new fields.StringField({ initial: "BREAK.APTITUDE.Grit" }),
                    color: new fields.StringField({ initial: "rgb(93, 186, 72) !important" }),
                    modifier: new fields.NumberField({ initial: 0 })
                }),
                insight: new fields.SchemaField({
                    value: new fields.NumberField({ initial: 10 }),
                    bon: new fields.NumberField({ initial: 0 }),
                    trait: new fields.NumberField({ initial: 0 }),
                    total: new fields.NumberField({ initial: 10 }),
                    description: new fields.StringField({ initial: "BREAK.APTITUDE.InsightDesc" }),
                    label: new fields.StringField({ initial: "BREAK.APTITUDE.Insight" }),
                    color: new fields.StringField({ initial: "rgb(23, 126, 194) !important" }),
                    modifier: new fields.NumberField({ initial: 0 })
                }),
                aura: new fields.SchemaField({
                    value: new fields.NumberField({ initial: 10 }),
                    bon: new fields.NumberField({ initial: 0 }),
                    trait: new fields.NumberField({ initial: 0 }),
                    total: new fields.NumberField({ initial: 10 }),
                    description: new fields.StringField({ initial: "BREAK.APTITUDE.AuraDesc" }),
                    label: new fields.StringField({ initial: "BREAK.APTITUDE.Aura" }),
                    color: new fields.StringField({ initial: "rgb(108, 60, 148) !important" }),
                    modifier: new fields.NumberField({ initial: 0 })
                })
            }),

            equipment: new fields.SchemaField({
                armor: new fields.ObjectField({ nullable: true }),
                outfit: new fields.ObjectField({ nullable: true }),
                accessory: new fields.ArrayField(new fields.ObjectField()),
                weapon: new fields.ArrayField(new fields.ObjectField()),
                shield: new fields.ObjectField({ nullable: true })
            }),

            allegiance: new fields.SchemaField({
                dark: new fields.NumberField({ initial: 0 }),
                bright: new fields.NumberField({ initial: 0 })
            }),

            notes: new fields.HTMLField({ initial: "" })
        };
    }

    computeDerivedData(actor) {
        const shield = this.equipment.shield;
        const armor = this.equipment.armor;
        
        this.hearts.bon = this.hearts.modifier;
        this.hearts.total = this.hearts.max + this.hearts.bon;
        this.hearts.value = Math.min(this.hearts.value, this.hearts.total);

        this.attack.bon = this.attack.modifier;
        this.attack.total = this.attack.value + this.attack.bon;

        this.speed.bon = Number(this.speed.modifier ?? 0) - Number(shield ? shield.system?.speedPenalty ?? 0 : 0);
        // Max speed is 3 (Very Fast), or if armor is worn then the armor's speed limit if it's less
        const maxSpeed = Math.min((armor?.system?.speedLimit != null ? +armor.system?.speedLimit ?? 3 : 3), 3);
        const rawSpeed = this.speed.value + this.speed.bon;
        this.speed.total = Math.min(rawSpeed, maxSpeed);

        this.defense.bon = this.defense.modifier;
        this.defense.bon = (this.sizeData ? +this.sizeData.defense : 0) + (shield ? shield.system?.defenseBonus ?? 0 : 0) + (armor ? +armor.system?.defenseBonus ?? 0 : 0) + (this.speed.total == 2 ? 2 : +this.speed.total >= 3 ? 4 : 0) + (this.defense.modifier ?? 0);
        this.defense.total = this.defense.value + this.defense.bon;

        this.hands.bon = this.hands.modifier;
        this.hands.total = this.hands.value + this.hands.bon;

        const A = this.aptitudes;
        for (const k of ["might", "deftness", "grit", "insight", "aura"]) {
            const ap = A[k];
            ap.bon = Number(ap.modifier ?? 0) + Number(ap.trait ?? 0);
            ap.total = ap.value + ap.bon;
        }
    }
}