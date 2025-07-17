import Action from "../system/action.js";
import BREAK from "../constants.js";

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

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actions = this.document.system.actions ?? [];
    context.actionCosts = BREAK.action_costs;
    context.rollTypes = BREAK.roll_types;
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#dragDrop.forEach((d) => d.bind(this.element))
    const html = $(this.element);

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

  static async onAddEffect(event) {
    event.preventDefault();
    return ActiveEffect.implementation.create({name: 'New effect'}, {parent: this.item, renderSheet: true});
  }

  static async onAddAction(event) {
    event.preventDefault();
    const actions = this.document.system.actions ?? [];
    actions.push(new Action("New action"));
    this.document.update({"system.actions": actions});
  }
  //#endregion

  _onOpenContextMenu(element) {
    const type = element.dataset.type;
    switch(type){
      case "effect":
        const effect = this.document.effects.get(element.dataset.id);
        if ( !effect || (effect instanceof Promise) ) return;
        ui.context.menuItems = this._getEffectContextOptions(effect);
        break;
      case "action":
        ui.context.menuItems = this.#getActionContextOptions();
        break;
    }
  }

  #getActionContextOptions() {
    const options = [
      {
        name: "BREAK.ContextMenuEdit",
        icon: "<i class='fas fa-edit fa-fw'></i>",
        condition: () => this.document.isOwner,
        callback: li => this._onDisplayEffect(li)
      },
      {
        name: "BREAK.ContextMenuDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        condition: () => this.document.isOwner,
        callback: li => this._onDeleteAction(li)
      }
    ];

    return options;
  }

  _getEffectContextOptions(effect) {
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

  async _onDeleteEffect(element) {
    const id = element.dataset.id;
    this.item.deleteEffect(id);
  }

  async _onDeleteAction(element) {
    const id = element.dataset.id;
    let actions = this.document.system.actions ?? [];
    actions = actions.filter(a => a.id !== id);
    this.document.update({"system.actions": actions});
  }

  async _onDisplayEffect(element) {
    const id = element.dataset.id;
    const effect = this.document.effects.get(id);
    effect.sheet.render(true);
  }

  _onChatButton(ev) {
    this.object.sendToChat();
  }

  getSubmitData(formData) {
    const updateData = foundry.utils.expandObject(formData.object);
    console.log(updateData);
    if(updateData.actions && this.document.system.actions) {
      Object.keys(updateData.actions).forEach(k => {
        const existingAction = this.document.system.actions.find(a => a.id === k);
        if(existingAction) {
          updateData.system.actions[k] = foundry.utils.mergeObject(existingAction, updateData.actions[k]);
        } else {
          updateData.system.actions[k] = updateData.actions[k];
        }
      });
    }
    return updateData;
  }
}
