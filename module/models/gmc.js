import { BreakBaseActorDataModel } from "./base-actor.js";

export class BreakGMCDataModel extends BreakBaseActorDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      ...super.defineSchema(),
      description: new fields.HTMLField({ initial: "" })
    };
  }

  computeDerivedData(actor) {
    super.computeDerivedData(actor);
  }
}
