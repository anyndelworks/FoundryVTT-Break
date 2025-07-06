/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheetV2}
 */
const {ItemSheetV2} = foundry.applications.sheets;
const {HandlebarsApplicationMixin} = foundry.applications.api;
const { DragDrop } = foundry.applications.ux
export class BreakItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  #dragDrop

  static DEFAULT_OPTIONS = {
    dragDrop: [{
      dragSelector: '[data-drag="true"]',
      dropSelector: '.drop-zone'
    }]
  }

  constructor(options = {}) {
    super(options)
    this.#dragDrop = this.#createDragDropHandlers()
  }

  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this)
      }
      d.callbacks = {
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this)
      }
      return new DragDrop(d)
    })
  }

  _canDragStart(selector) {
    return this.document.isOwner && this.isEditable
  }

  _canDragDrop(selector) {
    return this.document.isOwner && this.isEditable
  }

  _onDragOver(event) {
    console.log('over')
  }

  _onDrop(event) {
    console.log('drop')
  }

  //#region Actions
  static async onDeleteAbility(e) {
    this.item.onDeleteAbility(e);
  }

  static async onEditImage(event, target) {
    const field = target.dataset.field || "img"
    const current = foundry.utils.getProperty(this.document, field)

    const fp = new foundry.applications.apps.FilePicker({
      type: "image",
      current: current,
      callback: (path) => this.document.update({ [field]: path })
    })

    fp.render(true)
  }
  //#endregion
  /*_getHeaderButtons() {
    let buttons = super._getHeaderButtons();
    return [{
      label: "",
      class: "header-chat-button",
      icon: "fas fa-comment",
      onclick: ev => this._onChatButton(ev)
    }].concat(buttons);

  }*/

  _onChatButton(ev) {
    this.object.sendToChat();
  }

}
