/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheetV2}
 */
const {ItemSheetV2} = foundry.applications.sheets;
const {HandlebarsApplicationMixin} = foundry.applications.api;
const { DragDrop } = foundry.applications.ux
export class BreakItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  #dragDrop
  allowedItemTypes = [];
  static DEFAULT_OPTIONS = {
    dragDrop: [{
      dragSelector: '[data-drag="true"]',
      dropSelector: ''
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
        drop: this._onDrop.bind(this)
      }
      return new DragDrop(d)
    })
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#dragDrop.forEach((d) => d.bind(this.element))
  }

  _canDragStart(selector) {
    return this.document.isOwner && this.isEditable
  }

  _canDragDrop(selector) {
    return this.document.isOwner && this.isEditable
  }

  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data.type !== "Item") return;
    const draggedItem = await fromUuid(data.uuid);

    if (!this.allowedItemTypes.includes(draggedItem.type)) return;
    this._onDropValidItem(draggedItem);
  }

  _onDropValidItem(item) {
    console.log(item);
  }

  //#region Actions
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

  _onChatButton(ev) {
    this.object.sendToChat();
  }

}
