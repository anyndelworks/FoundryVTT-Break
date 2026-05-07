export class AreaConditionDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      description: new fields.HTMLField({ initial: "" }),
      applyEffectsWhileInside: new fields.BooleanField({ initial: true })
    };
  }
}
