const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class SizeSettingsForm extends HandlebarsApplicationMixin(ApplicationV2) {
  

  constructor(...args) {
    super(...args);
  }

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    tag: 'form',
    position: { width: 600, height: 700 },
    window: { title: 'CONFIG.SizeSettings', resizable: true },
    form: {
      handler: SizeSettingsForm.#onSubmitForm,
      submitOnChange: true
    }
  }

  /** @inheritDoc */
  static PARTS = {
    form: {
      template: 'systems/break/templates/system/size-settings.hbs',
      scrollable: [""]
    }
  }

  _prepareContext() {
    const sizes = foundry.utils.deepClone(game.settings.get("break", "sizes"));
    return {
      sizes
    };
  }

  static async #onSubmitForm(event, form, formData) {
    event.preventDefault()
    const expanded = foundry.utils.expandObject(formData.object);
    await game.settings.set("break", "sizes", expanded.sizes);
    this.render(false);
  }
}