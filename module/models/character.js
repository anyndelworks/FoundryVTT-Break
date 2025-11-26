import { BreakBaseActorDataModel } from "./base-actor.js";

export class BreakCharacterDataModel extends BreakBaseActorDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      ...super.defineSchema(),

      xp: new fields.SchemaField({
        rank: new fields.NumberField(),
        current: new fields.NumberField()
      }),

      languages: new fields.StringField(),
      description: new fields.StringField(),
      purviews: new fields.ArrayField(new fields.StringField()),
      slots: new fields.NumberField(),

      currency: new fields.SchemaField({
        gems: new fields.NumberField(),
        coins: new fields.NumberField(),
        stones: new fields.NumberField()
      }),
    };
  }

  computeDerivedData(actor) {
    this.computeItemEffects(actor);
    super.computeDerivedData(actor);
  }

  computeItemEffects(actor) {
    const items = actor.items;

    const species = items.find(i => i.type === "species");
    this._species = species ?? null;
    this.hasSpecies = !!species;

    const sizes = game.settings.get("break", "sizes");
    const sizeKey = this.size?.modifier ?? (species ? species.system.size : null);

    if (sizeKey && sizes[sizeKey]) {
      this.inventorySlots = sizes[sizeKey].inventorySize;
      this.sizeData = sizes[sizeKey];
    }

    const calling = items.find(i => i.type === "calling");
    this._calling = calling ?? null;
    this.hasCalling = !!calling;

    if (this.hasCalling && calling.system.advancementTable) {
      const table = calling.system.advancementTable;
      const rank = actor.system.xp?.rank ?? 1;

      if (table[rank - 1]) {
        const stats = table[rank - 1];

        this.aptitudes.might.value = stats.might;
        this.aptitudes.deftness.value = stats.deftness;
        this.aptitudes.grit.value = stats.grit;
        this.aptitudes.insight.value = stats.insight;
        this.aptitudes.aura.value = stats.aura;

        this.attack.value = stats.attack;
        this.hearts.max = stats.hearts;

        this.defense.value = calling.system.baseDefense;
        this.speed.value = calling.system.baseSpeed;
      }
    }
  }
}