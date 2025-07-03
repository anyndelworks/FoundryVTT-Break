const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api

export class WeaponTypeSettingsForm extends HandlebarsApplicationMixin(ApplicationV2) {
  

  constructor(...args) {
    super(...args);
  }

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    tag: 'form',
    position: { width: 600, height: 700 },
    window: { title: 'CONFIG.WeaponTypeSettings', resizable: true },
    form: {
      handler: WeaponTypeSettingsForm.#onSubmitForm,
      submitOnChange: true
    }
  }

  /** @inheritDoc */
  static PARTS = {
    form: {
      template: 'systems/break/templates/system/weapon-type-settings.hbs',
      scrollable: [""]
    }
  }

  _prepareContext() {
    const weaponTypes = foundry.utils.deepClone(game.settings.get("break", "weaponTypes"));
    return {
      weaponTypes
    };
  }

  static async #onSubmitForm(event, form, formData) {
    event.preventDefault()
    const expanded = foundry.utils.expandObject(formData.object);
    await game.settings.set("break", "weaponTypes", expanded.weaponTypes);
    this.render(false);
  }
}