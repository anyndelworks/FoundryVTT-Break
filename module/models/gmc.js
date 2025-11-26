export class BreakGMCDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      biography: new fields.StringField({ initial: "" }),
      description: new fields.StringField({ initial: "" })
    };
  }

  computeDerivedData(actor) {
    
  }
}