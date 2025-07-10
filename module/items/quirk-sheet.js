import { BreakItemSheet } from "./item-sheet.js";
import BREAK from "../constants.js";

export class BreakQuirkSheet extends BreakItemSheet {
  //#region DocumentV2 initialization and setup
    static DEFAULT_OPTIONS = {
      ...this.DEFAULT_OPTIONS,
      tag: "form",
      classes: ["break", "sheet", "quirk"],
      position: {
          width: 600,
          height: 480,
      },
      form: {
          handler: BreakQuirkSheet.#onSubmit,
          submitOnChange: true
      },
      window: {
          resizable: true
      },
      actions: {
        editImage: this.onEditImage,
        addEffect: this.#onAddEffect
      }
  }

  static PARTS = {
      header: {
        template: "systems/break/templates/items/shared/generic-header.hbs"
      },
      tabs: {
        template: "systems/break/templates/shared/sheet-tabs.hbs",
      },
      effects: {
        template: "systems/break/templates/items/quirk/quirk-effects-tab.hbs"
      },
      description: {
        template: "systems/break/templates/items/quirk/quirk-description-tab.hbs"
      }
  }

  static TABS = {
    primary: {
      initial: "description",
      tabs: [{id: "description", icon: "fas fa-scroll"}, {id: "effects", icon: "fas fa-sparkles"}],
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);
    if ( !this.isEditable ) return;

    html.find("[data-context-menu]").each((i, a) =>{
      a.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const { clientX, clientY } = event;
        event.currentTarget.closest("[data-id]").dispatchEvent(new PointerEvent("contextmenu", {
          view: window, bubbles: true, cancelable: true, clientX, clientY
        }));
      });
    });

    new foundry.applications.ux.ContextMenu.implementation(html[0], "[data-id]", [], {onOpen: this._onOpenContextMenu.bind(this), jQuery: false});
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.advantagesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.advantages, {
      secrets: this.document.isOwner,
      async: true
    });
    context.disadvantagesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.disadvantages, {
      secrets: this.document.isOwner,
      async: true
    });

    context.requiresType = true;
    context.itemTypes = Object.keys(BREAK.quirk_categories).map(k => ({
      key: k,
      label: game.i18n.localize(BREAK.quirk_categories[k]),
      active: context.document.system.type === k
    }));
    return context;
  }
  //#endregion

  //#region Actions
  static async #onAddEffect(event) {
    event.preventDefault();
    return ActiveEffect.implementation.create({name: 'New effect'}, {parent: this.item, renderSheet: true});
  }
  //#endregion

  async _onDeleteEffect(element) {
    const id = element.dataset.id;
    this.item.deleteEffect(id);
  }

  async _onDisplayEffect(element) {
    const id = element.dataset.id;
    const effect = this.document.effects.get(id);
    effect.sheet.render(true);
  }

  _onOpenContextMenu(element) {
    const effect = this.document.effects.get(element.dataset.id);
    if ( !effect || (effect instanceof Promise) ) return;
    ui.context.menuItems = this._getContextOptions(effect);
  }

  _getContextOptions(effect) {
    // Standard Options
    const options = [
      {
        name: "BREAK.ContextMenuEdit",
        icon: "<i class='fas fa-edit fa-fw'></i>",
        condition: () => effect.isOwner,
        callback: li => this._onDisplayEffect(li)
      },
      {
        name: "BREAK.ContextMenuDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        condition: () => effect.isOwner,
        callback: li => this._onDeleteEffect(li)
      }
    ];

    return options;
  }
  
  //#region DocumentV2 submit
  static async #onSubmit(event, form, formData) {
      event.preventDefault();
      const updateData = foundry.utils.expandObject(formData.object);
      await this.item.update(updateData);
  }
  //#endregion
}
