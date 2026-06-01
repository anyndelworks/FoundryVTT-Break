import { BreakBaseActorDataModel } from "./base-actor.js";

export class BreakCompanionDataModel extends BreakBaseActorDataModel {
  static CATEGORY_DEFAULTS = {
    follower: {
      slots: 0,
      hands: 2,
      capabilities: {
        canUseEquipment: true,
        canBeMounted: false,
        canCarryGear: true,
        battleReady: false
      }
    },
    pet: {
      slots: 6,
      hands: 0,
      capabilities: {
        canUseEquipment: false,
        canBeMounted: false,
        canCarryGear: true,
        battleReady: false
      }
    },
    mount: {
      slots: 12,
      hands: 0,
      capabilities: {
        canUseEquipment: false,
        canBeMounted: true,
        canCarryGear: true,
        battleReady: false
      }
    },
    "pack-beast": {
      slots: 20,
      hands: 0,
      capabilities: {
        canUseEquipment: false,
        canBeMounted: false,
        canCarryGear: true,
        battleReady: false
      }
    }
  };

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      ...super.defineSchema(),

      category: new fields.StringField({ initial: "pet" }),
      description: new fields.HTMLField({ initial: "" }),
      owner: new fields.StringField({ initial: null, nullable: true }),
      named: new fields.BooleanField({ initial: false }),

      loyalty: new fields.SchemaField({
        recruited: new fields.BooleanField({ initial: false }),
        autoPass: new fields.BooleanField({ initial: false })
      }),

      cost: new fields.SchemaField({
        price: new fields.SchemaField({
          gems: new fields.NumberField({ initial: 0, min: 0 }),
          coins: new fields.NumberField({ initial: 0, min: 0 }),
          stones: new fields.NumberField({ initial: 0, min: 0 })
        }),
        fee: new fields.SchemaField({
          gems: new fields.NumberField({ initial: 0, min: 0 }),
          coins: new fields.NumberField({ initial: 0, min: 0 }),
          stones: new fields.NumberField({ initial: 0, min: 0 })
        })
      }),

      capabilities: new fields.SchemaField({
        canUseEquipment: new fields.BooleanField({ initial: false }),
        canBeMounted: new fields.BooleanField({ initial: false }),
        canCarryGear: new fields.BooleanField({ initial: true }),
        battleReady: new fields.BooleanField({ initial: false })
      }),

      mount: new fields.SchemaField({
        riderSize: new fields.NumberField({ initial: null, nullable: true, integer: true }),
        riderSlots: new fields.NumberField({ initial: 0 })
      }),

      services: new fields.HTMLField({ initial: "" })
    };
  }

  static migrateData(source) {
    source = super.migrateData(source);
    if (typeof source.mount?.riderSize === "string") {
      source.mount.riderSize = BreakBaseActorDataModel.normalizeSizeValue(source.mount.riderSize);
    }
    return source;
  }

  static getCategoryDefaults(category) {
    return this.CATEGORY_DEFAULTS[category] ?? this.CATEGORY_DEFAULTS.pet;
  }

  computeBaseData(actor) {
    const categoryDefaults = BreakCompanionDataModel.getCategoryDefaults(this.category);

    this.hands.value = categoryDefaults.hands;

    if (!this.slots.value) {
      this.slots.value = categoryDefaults.slots;
    }
    super.computeBaseData(actor);
  }

  computeDerivedData(actor) {
    super.computeDerivedData(actor);
    this.inventorySlots = this.slots.total;
  }
}
