import { BreakItem } from "../items/item.js";
import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";
import { BreakCompanionDataModel } from "../models/companion.js";
import { BreakActorSheet } from "./actor-sheet.js";

const allowedItemTypes = ["ability", "accessory", "ammo", "armor", "outfit", "shield", "item", "weapon"];

export class BreakCompanionSheet extends BreakActorSheet {
  _viewOnly = true;

  static DEFAULT_OPTIONS = {
    classes: ["break", "sheet", "actor", "companion"],
    form: {
      handler: BreakCompanionSheet.#onSubmit,
      submitOnChange: true
    },
    actions: {
      toggleEditable: this.#onToggleEditable,
      selectFeature: this.#onSelectFeature,
      selectOwner: this.#onSelectOwner,
      openOwner: this.#onOpenOwner,
      clearOwner: this.#onClearOwner
    }
  }

  static TABS = {
    primary: {
      initial: "details",
      tabs: [
        { id: "details", icon: "fas fa-paw" },
        { id: "combat", icon: "fas fa-sword" },
        { id: "inventory", icon: "fas fa-sack" },
        { id: "notes", icon: "fas fa-scroll" }
      ],
    }
  }

  static PARTS = {
    header: {
      template: "systems/break/templates/actors/companion/parts/sheet-header.hbs"
    },
    tabs: {
      template: "systems/break/templates/shared/sheet-tabs.hbs",
    },
    details: {
      template: "systems/break/templates/actors/companion/parts/sheet-tab-details.hbs",
      scrollable: [""]
    },
    combat: {
      template: "systems/break/templates/actors/companion/parts/sheet-tab-combat.hbs",
      scrollable: [""]
    },
    inventory: {
      template: "systems/break/templates/actors/companion/parts/sheet-tab-inventory.hbs",
      scrollable: [""]
    },
    notes: {
      template: "systems/break/templates/actors/companion/parts/sheet-tab-notes.hbs",
      scrollable: [""]
    }
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const html = $(this.element);
    this._toggleSheetControls(!context.editable);

    if (!context.editable) return;

    html.find("[data-context-menu]").each((i, a) => {
      a.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const { clientX, clientY } = event;
        event.currentTarget.closest("[data-id]").dispatchEvent(new PointerEvent("contextmenu", {
          view: window, bubbles: true, cancelable: true, clientX, clientY
        }));
      });
    });

    new foundry.applications.ux.ContextMenu.implementation(html[0], "[data-id]", [], { onOpen: this._onOpenContextMenu.bind(this), jQuery: false });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const sizes = this.getSizes();
    const category = context.document.system.category;
    const equipment = context.document.system.equipment;

    context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
      secrets: this.document.isOwner,
      async: true
    });
    context.servicesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.services, {
      secrets: this.document.isOwner,
      async: true
    });

    context.abilities = context.document.items.filter(i => i.type === "ability");
    context.categories = ["follower", "pet", "mount", "pack-beast"].map(key => ({
      key,
      label: game.i18n.localize(`BREAK.COMPANION.Category.${key}`),
      active: category === key
    }));
    context.ownerActor = context.document.system.owner ? await fromUuid(context.document.system.owner) : null;
    context.sizes = Object.keys(sizes).map(k => ({
      key: k,
      label: sizes[k].label,
      active: context.document.system.size.value === k
    }));
    context.mountSizes = [
      { key: "", label: game.i18n.localize("BREAK.None"), active: !context.document.system.mount.riderSize },
      ...Object.keys(sizes).map(k => ({
        key: k,
        label: sizes[k].label,
        active: context.document.system.mount.riderSize === k
      }))
    ];

    context.inventorySlots = context.document.system.inventorySlots ?? context.document.system.slots.total;
    context.defenseRating = context.document.system.defense.total;
    context.editable = this.isEditable && !this._viewOnly;
    context.hasEquippedItems = !!(
      equipment.armor ||
      equipment.outfit ||
      equipment.shield ||
      equipment.weapon?.length ||
      equipment.accessory?.length
    );
    context.showEquipmentSection = !!(
      context.document.system.capabilities.canUseEquipment ||
      context.document.system.hands.total > 0 ||
      context.hasEquippedItems
    );
    context.showInventorySection = !!(
      context.document.system.capabilities.canCarryGear ||
      context.inventorySlots > 0 ||
      context.bagContent?.length
    );

    return context;
  }

  async _onDrop(event) {
    const ownerSlot = event.target.closest("[data-owner-drop]");
    if (ownerSlot) {
      const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
      if (data.type !== "Actor") return false;
      const owner = await fromUuid(data.uuid);
      if (!owner || owner.uuid === this.actor.uuid) return false;
      await this.actor.update({ "system.owner": owner.uuid });
      return true;
    }

    const slot = event.target.closest(".equipment-drag-slot");
    if (!slot) return super._onDrop(event);
    const dragData = event.dataTransfer.getData("application/json");
    if (!dragData) return super._onDrop(event);
    const id = JSON.parse(dragData).id;
    const item = this.actor.items.find(i => i._id == id);
    this._onEquipItem(item);

    return true;
  }

  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);
    if (!allowedItemTypes.includes(item.type)) return false;
    if (this.actor.items.some(i => i._id === item._id)) return false;

    return BreakItem.createDocuments([item], { pack: this.actor.pack, parent: this.actor, keepId: true });
  }

  static #onSelectFeature(event) {
    event.preventDefault();
    new FeatureSelectionDialog({
      itemType: "ability",
      document: this.document,
      filters: [i => i.type === "ability", i => !this.actor.items.find(it => it.uuid === i.uuid)]
    }).render(true);
  }

  static #onToggleEditable(event) {
    event.preventDefault();
    this._viewOnly = !this._viewOnly;
    this.render(true);
  }

  static async #onSubmit(event, form, formData) {
    event.preventDefault();
    const updateData = foundry.utils.expandObject(formData.object);
    const newCategory = updateData.system?.category;
    const oldCategory = this.actor.system.category;

    if (newCategory && newCategory !== oldCategory) {
      const defaults = BreakCompanionDataModel.getCategoryDefaults(newCategory);
      updateData.system.hands = updateData.system.hands ?? {};
      updateData.system.hands.value = defaults.hands;
      updateData.system.capabilities = {
        ...updateData.system.capabilities,
        ...defaults.capabilities
      };
      if (!updateData.system.slots?.value) {
        updateData.system.slots = updateData.system.slots ?? {};
        updateData.system.slots.value = defaults.slots;
      }
    }

    await this.actor.update(updateData);
  }

  static #onSelectOwner(event) {
    event.preventDefault();
    new FeatureSelectionDialog({
      documentType: "Actor",
      itemType: "character",
      allowedTypes: ["character", "gmc", "adversary"],
      document: this.document,
      filters: [a => a.uuid !== this.actor.uuid],
      callback: async (actors) => {
        const owner = actors[0];
        await this.actor.update({ "system.owner": owner?.uuid ?? null });
      }
    }).render(true);
  }

  static async #onOpenOwner(event) {
    event.preventDefault();
    const ownerUuid = this.actor.system.owner;
    if (!ownerUuid) return;
    const owner = await fromUuid(ownerUuid);
    owner?.sheet?.render(true);
  }

  static async #onClearOwner(event) {
    event.preventDefault();
    await this.actor.update({ "system.owner": null });
  }

  _onOpenContextMenu(element) {
    const item = this.document.items.get(element.dataset.id);
    if (!item || (item instanceof Promise)) return;

    item.equippable = element.dataset.equippable;
    ui.context.menuItems = this._getContextOptions(item);
  }

  _getContextOptions(item) {
    const options = [
      {
        label: "BREAK.Equip",
        icon: "<i class='fa-solid fa-shield'></i>",
        visible: () => item.equippable === "true",
        onClick: (event, target) => {
          const id = target.dataset.id;
          const targetItem = this.document.items.get(id);
          this._onEquipItem(targetItem);
        }
      },
      {
        label: "BREAK.SendToChat",
        icon: "<i class='fa-solid fa-fw fa-comment-alt'></i>",
        visible: () => item.isOwner,
        onClick: (event, target) => this._onSendToChat(target)
      },
      {
        label: "BREAK.ContextMenuDelete",
        icon: "<i class='fas fa-trash fa-fw'></i>",
        visible: () => item.isOwner,
        onClick: (event, target) => this._onDeleteItem(target)
      }
    ];

    return options;
  }
}
