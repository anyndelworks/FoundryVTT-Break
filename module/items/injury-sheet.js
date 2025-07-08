import { BreakItemSheet } from "./item-sheet.js";

export class BreakInjurySheet extends BreakItemSheet {

  //#region DocumentV2 initialization and setup
  static DEFAULT_OPTIONS = {
      ...this.DEFAULT_OPTIONS,
      tag: "form",
      classes: ["break", "sheet", "injury"],
      position: {
          width: 600,
          height: 480,
      },
      form: {
          handler: BreakInjurySheet.#onSubmit,
          submitOnChange: true
      },
      window: {
          resizable: true
      },
      actions: {
        editImage: this.onEditImage,
        linkEffect: this.#onLinkEffect,
        addEffect: this.#onAddEffect
      }
  }

  static PARTS = {
      header: {
          template: "systems/break/templates/items/shared/generic-header.hbs"
      },
      body: {
          template: "systems/break/templates/items/injury/injury-sheet.hbs"
      }
  }

  async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
        secrets: this.document.isOwner,
        async: true
      });
      return context;
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
  //#endregion

  //#region Actions
  static async #onLinkEffect(event) {
    event.preventDefault();
    const button = event.target.closest("[data-id]");
    const id = button.dataset.id;
    const effect = this.document.effects.get(id);
  }

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
