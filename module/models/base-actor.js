export class BreakBaseActorDataModel extends foundry.abstract.DataModel {
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
        if (typeof source.slots === "number") {
            source.slots = {
                value: source.slots
            };
        }
        if (typeof source.size === "string" || source.size === null) {
            source.size = {
                value: BreakBaseActorDataModel.normalizeSizeValue(source.size)
            };
        }
        else if (typeof source.size?.value === "string") {
            source.size.value = BreakBaseActorDataModel.normalizeSizeValue(source.size.value);
        }
        for (const key of ["attack", "defense", "speed", "hands", "slots"]) {
            if (source[key] && typeof source[key] === "object") {
                BreakBaseActorDataModel.#migrateValueOnlyStat(source[key]);
            }
        }
        if (source.hearts && typeof source.hearts === "object") {
            BreakBaseActorDataModel.#migrateHearts(source.hearts);
        }
        for (const key of ["might", "deftness", "grit", "insight", "aura"]) {
            const aptitude = source.aptitudes?.[key];
            if (!aptitude || typeof aptitude !== "object") continue;
            BreakBaseActorDataModel.#migrateAptitude(aptitude);
        }
        return source;
    }

    static normalizeSizeValue(value) {
        if (value == null || value === "") return null;
        if (typeof value === "string" && value in BreakBaseActorDataModel.LEGACY_SIZE_VALUES) {
            return BreakBaseActorDataModel.LEGACY_SIZE_VALUES[value];
        }
        const number = Number(value);
        return Number.isFinite(number) ? Math.round(number) : null;
    }

    static getSizeEntries() {
        const sizes = game.settings.get("break", "sizes") ?? {};
        return Object.entries(sizes).map(([key, data], index) => ({
            key,
            value: BreakBaseActorDataModel.normalizeSizeValue(key) ?? BreakBaseActorDataModel.LEGACY_SIZE_VALUES[key] ?? index,
            data
        })).sort((a, b) => a.value - b.value);
    }

    static getSizeData(value) {
        const entries = BreakBaseActorDataModel.getSizeEntries();
        if (!entries.length) return { value: null, data: null };
        const normalized = BreakBaseActorDataModel.normalizeSizeValue(value);
        if (normalized == null) return { value: null, data: null };
        const min = entries[0].value;
        const max = entries[entries.length - 1].value;
        const effective = Math.clamp(normalized, min, max);
        const entry = entries.find(size => size.value === effective);
        return { value: effective, data: entry?.data ?? null };
    }

    static #migrateValueOnlyStat(stat) {
        if (stat.value == null && stat.total != null) stat.value = Number(stat.total);
        else if (stat.value != null) stat.value = Number(stat.value);
        delete stat.bon;
        delete stat.total;
        delete stat.modifier;
        delete stat.override;
    }

    static #migrateHearts(hearts) {
        if (hearts.value != null) hearts.value = Number(hearts.value);
        if (hearts.max == null && hearts.total != null) hearts.max = Number(hearts.total);
        else if (hearts.max != null) hearts.max = Number(hearts.max);
        delete hearts.bon;
        delete hearts.total;
        delete hearts.modifier;
        delete hearts.override;
    }

    static #migrateAptitude(aptitude) {
        if (aptitude.value == null && aptitude.total != null) aptitude.value = Number(aptitude.total);
        else if (aptitude.value != null) aptitude.value = Number(aptitude.value);
        if (aptitude.trait != null) aptitude.trait = Math.clamp(Number(aptitude.trait), -2, 2);
        delete aptitude.bon;
        delete aptitude.total;
        delete aptitude.modifier;
        delete aptitude.override;
    }

    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            attack: new fields.SchemaField({
                value: new fields.NumberField({ initial: 0 })
            }),

            defense: new fields.SchemaField({
                value: new fields.NumberField({ initial: 0 })
            }),

            speed: new fields.SchemaField({
                value: new fields.NumberField({ initial: 1, min: 0, max: 3, integer: true })
            }),

            hearts: new fields.SchemaField({
                value: new fields.NumberField({ initial: 0 }),
                max: new fields.NumberField({ initial: 0 })
            }),

            hands: new fields.SchemaField({
                value: new fields.NumberField({ initial: 2 })
            }),

            slots: new fields.SchemaField({
                value: new fields.NumberField({ initial: 0 })
            }),

            size: new fields.SchemaField({
                value: new fields.NumberField({ nullable: true, initial: null, integer: true })
            }),

            aptitudes: new fields.SchemaField({
                might: new fields.SchemaField({
                    value: new fields.NumberField({ initial: 10 }),
                    trait: new fields.NumberField({ initial: 0, min: -2, max: 2, integer: true }),
                    description: new fields.StringField({ initial: "BREAK.APTITUDE.MightDesc" }),
                    label: new fields.StringField({ initial: "BREAK.APTITUDE.Might" }),
                    color: new fields.StringField({ initial: "rgb(238, 61, 52) !important" })
                }),
                deftness: new fields.SchemaField({
                    value: new fields.NumberField({ initial: 10 }),
                    trait: new fields.NumberField({ initial: 0, min: -2, max: 2, integer: true }),
                    description: new fields.StringField({ initial: "BREAK.APTITUDE.DeftnessDesc" }),
                    label: new fields.StringField({ initial: "BREAK.APTITUDE.Deftness" }),
                    color: new fields.StringField({ initial: "rgb(244, 127, 38) !important;" })
                }),
                grit: new fields.SchemaField({
                    value: new fields.NumberField({ initial: 10 }),
                    trait: new fields.NumberField({ initial: 0, min: -2, max: 2, integer: true }),
                    description: new fields.StringField({ initial: "BREAK.APTITUDE.GritDesc" }),
                    label: new fields.StringField({ initial: "BREAK.APTITUDE.Grit" }),
                    color: new fields.StringField({ initial: "rgb(93, 186, 72) !important" })
                }),
                insight: new fields.SchemaField({
                    value: new fields.NumberField({ initial: 10 }),
                    trait: new fields.NumberField({ initial: 0, min: -2, max: 2, integer: true }),
                    description: new fields.StringField({ initial: "BREAK.APTITUDE.InsightDesc" }),
                    label: new fields.StringField({ initial: "BREAK.APTITUDE.Insight" }),
                    color: new fields.StringField({ initial: "rgb(23, 126, 194) !important" })
                }),
                aura: new fields.SchemaField({
                    value: new fields.NumberField({ initial: 10 }),
                    trait: new fields.NumberField({ initial: 0, min: -2, max: 2, integer: true }),
                    description: new fields.StringField({ initial: "BREAK.APTITUDE.AuraDesc" }),
                    label: new fields.StringField({ initial: "BREAK.APTITUDE.Aura" }),
                    color: new fields.StringField({ initial: "rgb(108, 60, 148) !important" })
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

    computeBaseData(actor) {
        this._baseStats = {
            attack: Number(this.attack.value ?? 0),
            defense: Number(this.defense.value ?? 0),
            speed: Number(this.speed.value ?? 0),
            hearts: Number(this.hearts.max ?? 0),
            hands: Number(this.hands.value ?? 0),
            slots: Number(this.slots.value ?? 0),
            allegiance: {
                dark: Number(this.allegiance.dark ?? 0),
                bright: Number(this.allegiance.bright ?? 0)
            },
            aptitudes: {}
        };
        for (const k of ["might", "deftness", "grit", "insight", "aura"]) {
            this._baseStats.aptitudes[k] = Number(this.aptitudes[k]?.value ?? 0);
        }
    }

    static #getActiveEffectChanges(actor, path) {
        const effects = Array.from(actor?.appliedEffects ?? actor?.effects ?? []);
        return effects.flatMap(effect => {
            if (effect.disabled || effect.active === false) return [];
            return (effect.changes ?? [])
                .filter(change => change.key === path)
                .map(change => `${effect.name}: ${BreakBaseActorDataModel.#formatEffectChange(change)}`);
        }).join("\n");
    }

    static #formatEffectChange(change) {
        const value = change.value ?? "";
        switch (change.mode) {
            case CONST.ACTIVE_EFFECT_MODES.ADD:
                return `${Number(value) > 0 ? "+" : ""}${value}`;
            case CONST.ACTIVE_EFFECT_MODES.SUBTRACT:
                return `-${value}`;
            case CONST.ACTIVE_EFFECT_MODES.MULTIPLY:
                return `x${value}`;
            case CONST.ACTIVE_EFFECT_MODES.OVERRIDE:
                return `= ${value}`;
            case CONST.ACTIVE_EFFECT_MODES.UPGRADE:
                return `min ${value}`;
            case CONST.ACTIVE_EFFECT_MODES.DOWNGRADE:
                return `max ${value}`;
            default:
                return `${value}`;
        }
    }

    computeDerivedData(actor) {
        const shield = this.equipment.shield;
        const armor = this.equipment.armor;
        const size = BreakBaseActorDataModel.getSizeData(this.size.value);

        this.size.effective = size.value;
        this.sizeData = size.data;
        
        this.hearts.base = Number(this._baseStats?.hearts ?? this.hearts.max ?? 0);
        this.hearts.total = Number(this.hearts.max ?? 0);
        this.hearts.bon = this.hearts.total - this.hearts.base;
        this.hearts.effectsTooltip = BreakBaseActorDataModel.#getActiveEffectChanges(actor, "system.hearts.max");
        this.hearts.value = Math.min(this.hearts.value, this.hearts.total);

        this.attack.base = Number(this._baseStats?.attack ?? this.attack.value ?? 0);
        this.attack.total = Number(this.attack.value ?? 0);
        this.attack.bon = this.attack.total - this.attack.base;
        this.attack.effectsTooltip = BreakBaseActorDataModel.#getActiveEffectChanges(actor, "system.attack.value");

        // Max speed is 3 (Very Fast), or if armor is worn then the armor's speed limit if it's less
        const maxSpeed = Math.min((armor?.system?.speedLimit != null ? +armor.system?.speedLimit ?? 3 : 3), 3);
        const shieldSpeedPenalty = Number(shield ? shield.system?.speedPenalty ?? 0 : 0);
        const rawSpeed = Number(this.speed.value ?? 0) - shieldSpeedPenalty;
        this.speed.base = Number(this._baseStats?.speed ?? this.speed.value ?? 0);
        this.speed.total = Math.clamp(Math.min(rawSpeed, maxSpeed), 0, 3);
        this.speed.bon = this.speed.total - this.speed.base;
        this.speed.effectsTooltip = BreakBaseActorDataModel.#getActiveEffectChanges(actor, "system.speed.value");

        const defenseEquipmentBonus = (this.sizeData ? +this.sizeData.defense : 0)
            + (shield ? shield.system?.defenseBonus ?? 0 : 0)
            + (armor ? +armor.system?.defenseBonus ?? 0 : 0)
            + (this.speed.total == 2 ? 2 : +this.speed.total >= 3 ? 4 : 0);
        this.defense.base = Number(this._baseStats?.defense ?? this.defense.value ?? 0);
        this.defense.total = Number(this.defense.value ?? 0) + defenseEquipmentBonus;
        this.defense.bon = this.defense.total - this.defense.base;
        this.defense.effectsTooltip = BreakBaseActorDataModel.#getActiveEffectChanges(actor, "system.defense.value");

        this.hands.base = Number(this._baseStats?.hands ?? this.hands.value ?? 0);
        this.hands.total = Number(this.hands.value ?? 0);
        this.hands.bon = this.hands.total - this.hands.base;
        this.hands.effectsTooltip = BreakBaseActorDataModel.#getActiveEffectChanges(actor, "system.hands.value");

        const manualSlotsBase = Number(this._baseStats?.slots ?? this.slots.value ?? 0);
        this.slots.base = Number(this.sizeData?.inventorySize ?? manualSlotsBase);
        const slotEffectDelta = Number(this.slots.value ?? 0) - manualSlotsBase;
        this.slots.total = this.sizeData ? this.slots.base + slotEffectDelta : manualSlotsBase;
        this.slots.bon = this.slots.total - this.slots.base;
        this.slots.effectsTooltip = BreakBaseActorDataModel.#getActiveEffectChanges(actor, "system.slots.value");

        this.allegiance.base = {
            dark: Number(this._baseStats?.allegiance?.dark ?? this.allegiance.dark ?? 0),
            bright: Number(this._baseStats?.allegiance?.bright ?? this.allegiance.bright ?? 0)
        };

        const aptitudes = this.aptitudes;
        for (const k of ["might", "deftness", "grit", "insight", "aura"]) {
            const aptitude = aptitudes[k];
            aptitude.base = Number(this._baseStats?.aptitudes?.[k] ?? aptitude.value ?? 0);
            aptitude.trait = Math.clamp(Number(aptitude.trait ?? 0), -2, 2);
            aptitude.total = Math.floor(Number(aptitude.value ?? 0) + Number(aptitude.trait ?? 0) + Number(this.sizeData?.[k] ?? 0));
            aptitude.bon = aptitude.total - aptitude.base;
            aptitude.effectsTooltip = BreakBaseActorDataModel.#getActiveEffectChanges(actor, `system.aptitudes.${k}.value`);
        }
    }
}
