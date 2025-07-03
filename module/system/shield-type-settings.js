const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class ShieldTypeSettingsForm extends HandlebarsApplicationMixin(ApplicationV2) {
  

  constructor(...args) {
    super(...args);
  }

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    tag: 'form',
    position: { width: 600, height: 700 },
    window: { title: 'CONFIG.ShieldTypeSettings', resizable: true },
    form: {
      handler: ShieldTypeSettingsForm.#onSubmitForm,
      submitOnChange: true
    }
  }

  /** @inheritDoc */
  static PARTS = {
    form: {
      template: 'systems/break/templates/system/shield-type-settings.hbs',
      scrollable: [""]
    }
  }

  _prepareContext() {
    const shieldTypes = foundry.utils.deepClone(game.settings.get("break", "shieldTypes"));
    return {
      shieldTypes
    };
  }

  static async #onSubmitForm(event, form, formData) {
    event.preventDefault()
    const expanded = foundry.utils.expandObject(formData.object);
    await game.settings.set("break", "shieldTypes", expanded.shieldTypes);
    this.render(false);
  }
}