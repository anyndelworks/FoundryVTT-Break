import Action from "../system/action.js";
import BREAK from "../constants.js";
import ActionFormDialog from "../dialogs/action-form-dialog.js"

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
    context.actions = context.actions.map(a => ({
      ...a,
      rollTypeLabel: BREAK.roll_types[a.rollType].label,
      actionCostLabel: BREAK.action_costs[a.cost].label
    }));
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

    new foundry.applications.ux.ContextMenu(this.element, "[data-id]", [], {onOpen: this._onOpenContextMenu.bind(this), jQuery: false, fixed: true});

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
    actions.push(Action.create("New action"));
    this.document.update({"system.actions": actions});
  }

  static async onDisplayAction(event) {
    event.preventDefault();
    const id = event.target.dataset.id;
    const action = this.document.system.actions.find(a => a.id === id);
    console.log(action);
    new ActionFormDialog(this.item, action.id).render(true);
  }

  static async onDisplayEffect(element) {
    event.preventDefault();
    const id = event.target.dataset.id;
    const effect = this.document.effects.get(id);
    effect.sheet.render(true);
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
      case "ability":
        ui.context.menuItems = this.#getAbilityContextOptions();
        break;
    }
  }

  #getActionContextOptions() {
    const options = [
      {
        name: "BREAK.SendToChat",
        icon: "<i class='fa-solid fa-fw fa-comment-alt'></i>",
        condition: () => this.document.isOwner,
        callback: li => this._onSendActionToChat(li)
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

  #getAbilityContextOptions() {
    const options = [
      {
        name: "BREAK.SendToChat",
        icon: "<i class='fa-solid fa-fw fa-comment-alt'></i>",
        condition: () => this.document.isOwner,
        callback: li => this._onSendAbilityToChat(li)
      },
      {
        name: "BREAK.ContextMenuDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        condition: () => this.document.isOwner,
        callback: li => this._onDeleteAbility(li)
      }
    ];
    return options;
  }

  _getEffectContextOptions(effect) {
    // Standard Options
    const options = [
      {
        name: "BREAK.ContextMenuDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        condition: () => effect.isOwner,
        callback: li => this._onDeleteEffect(li)
      }
    ];

    return options;
  }

  async _onSendAbilityToChat(element) {
    const id = element.dataset.id;
    const ability = await fromUuid(id);
    if(ability)
      ability.sendToChat();
  }

  async _onDeleteAbility(element) {
    const uuid = element.dataset.id;
    let abilities = this.document.system.abilities ?? [];
    abilities = abilities.filter(a => a !== uuid);
    this.document.update({"system.abilities": abilities});
  }

  async addAbility(ability) {
    const abilities = [...this.item.system.abilities ?? []];
    if(!abilities.includes(ability.uuid) && ability.system.type === this.item.type) {
      abilities.push(ability.uuid);
      this.item.update({"system.abilities": abilities});
    }
  }

  async addAbilities(newAbilities) {
    const abilities = [...this.document.system.abilities ?? []];
    newAbilities.forEach(ability => {
      if(!abilities.includes(ability.uuid) && ability.system.type === this.item.type)
        abilities.push(ability.uuid);
    });
    this.document.update({"system.abilities": abilities});
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

  async _onSendActionToChat(element) {
    const id = element.dataset.id;
    const actions = this.document.system.actions ?? [];
    const action = actions.find(a => a.id === id);
    if(action)
      Action.sendToChat(action);
  }

  _onChatButton(ev) {
    this.object.sendToChat();
  }

  getSubmitData(formData) {
    const updateData = foundry.utils.expandObject(formData.object);
    if(updateData.actions && this.document.system.actions) {
      updateData.system.actions = [];
      Object.keys(updateData.actions).forEach(k => {
        const existingAction = this.document.system.actions.findIndex(a => a.id === k);
        if(existingAction > -1) {
          updateData.system.actions[existingAction] = foundry.utils.mergeObject(this.document.system.actions[existingAction], updateData.actions[k]);
        } else {
          updateData.system.actions.push(updateData.actions[k]);
        }
      });
      delete updateData.actions;
    }
    return updateData;
  }
}
