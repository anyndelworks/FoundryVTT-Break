import { BreakItemSheet } from "./item-sheet.js";

export class BreakInjurySheet extends BreakItemSheet {

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["break", "sheet", "injury"],
      template: "systems/break/templates/items/injury-sheet.hbs",
      width: 600,
      height: 480,
      dragDrop: [{dragSelector: null, dropSelector: null}]
    });
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  async getData(options) {
    const context = await super.getData(options);
    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.item.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    return context;
  }

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
        callback: li => this._onDisplayEffect(li[0])
      },
      {
        name: "BREAK.ContextMenuDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        condition: () => effect.isOwner,
        callback: li => this._onDeleteEffect(li[0])
      }
    ];

    return options;
  }

  /* -------------------------------------------- */

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    html.find("a.effect-link").on("click", this._onLinkEffect.bind(this));

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

    new ContextMenu(html, "[data-id]", [], {onOpen: this._onOpenContextMenu.bind(this)});

    if ( !this.isEditable ) return;

    html.find("a.add-effect").on("click", this._onAddEffect.bind(this));
  }

  /* -------------------------------------------- */

  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    return formData;
  }

  async _onLinkEffect(event) {
    event.preventDefault();
    const button = event.currentTarget.closest("[data-id]");
    const id = button.dataset.id;
    const effect = this.document.effects.get(id);
  }


  async _onAddEffect(event) {
    event.preventDefault();
    return ActiveEffect.implementation.create({name: 'New effect'}, {parent: this.item, renderSheet: true});
  }
  
}
