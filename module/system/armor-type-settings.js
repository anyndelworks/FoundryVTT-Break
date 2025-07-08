const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class ArmorTypeSettingsForm extends HandlebarsApplicationMixin(ApplicationV2) {
  

  constructor(...args) {
    super(...args);
  }

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    tag: 'form',
    position: { width: 600, height: 700 },
    window: { title: 'CONFIG.ArmorTypeSettings', resizable: true },
    form: {
      handler: ArmorTypeSettingsForm.#onSubmitForm,
      submitOnChange: true
    }
  }

  /** @inheritDoc */
  static PARTS = {
    form: {
      template: 'systems/break/templates/system/armor-type-settings.hbs',
      scrollable: [""]
    }
  }

  _prepareContext() {
    const armorTypes = foundry.utils.deepClone(game.settings.get("break", "armorTypes"));
    return {
      armorTypes
    };
  }

  static async #onSubmitForm(event, form, formData) {
    event.preventDefault()
    const expanded = foundry.utils.expandObject(formData.object);
    await game.settings.set("break", "armorTypes", expanded.armorTypes);
    this.render(false);
  }
}