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
      size: new fields.StringField({ initial: null, nullable: true }),
      slots: new fields.NumberField({ initial: 0 }),
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
        riderSize: new fields.StringField({ initial: null, nullable: true }),
        riderSlots: new fields.NumberField({ initial: 0 })
      }),

      services: new fields.HTMLField({ initial: "" })
    };
  }

  static getCategoryDefaults(category) {
    return this.CATEGORY_DEFAULTS[category] ?? this.CATEGORY_DEFAULTS.pet;
  }

  computeDerivedData(actor) {
    const categoryDefaults = BreakCompanionDataModel.getCategoryDefaults();
    const sizes = game.settings.get("break", "sizes");

    this.hands.value = categoryDefaults.hands;

    this.inventorySlots = this.slots || categoryDefaults.slots;

    if (this.size && sizes[this.size]) {
      this.sizeData = sizes[this.size];
      if (!this.slots) {
        this.inventorySlots = sizes[this.size].inventorySize || categoryDefaults.slots;
      }
    }

    super.computeDerivedData(actor);
  }
}
