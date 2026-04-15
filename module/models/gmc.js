export class BreakGMCDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      notes: new fields.HTMLField({ initial: "" })
    };
  }

  computeDerivedData(actor) {
    
  }
}