import BREAK from "../constants.js";
import { FeatureSelectionDialog } from "./feature-selection-dialog.js";
const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
export default class ActionFormDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(item, actionId, options = {}) {
        super(options);
        this.item = item;
        this.actionId = actionId;
        const actions = this.item.system.actions ?? [];
        this.action = actions.find(a => a.id === this.actionId);
    }

    static DEFAULT_OPTIONS = {
        id: "action-form-dialog",
        window: { title: "Edit Action", resizable: true },
        form: { closeOnSubmit: true, handler: ActionFormDialog._handleSubmit },
        position: { width: 800, height: 650 },
        tag: "form",
        actions: {
            selectReference: this.#onSelectReference,
            clearReference: this.#onClearReference,
            openReference: this.#onOpenReference,
        }
    };

    static PARTS = {
        form: {
            template: 'systems/break/templates/system/action-sheet.hbs'
        }
    }

    async _prepareContext() {        
        return {
            item: this.item,
            action: this.action,
            rollTypes: BREAK.roll_types,
            costs: BREAK.action_costs,
            aptitudes: BREAK.aptitudes,
            targets: BREAK.action_targets,
            effects: BREAK.action_effects,
            requiredItemLabel: this.action.requiredItemName || game.i18n.localize("BREAK.None"),
            consumeItemLabel: this.action.consumeItemName || game.i18n.localize("BREAK.None"),
        };
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        const html = $(this.element);

        html.find(".roll-type-select").on("change", this._toggleConditionalFields.bind(this));
        html.find(".effect-type-select").on("change", this._toggleEffectFields.bind(this));
        html.find(".action-item-drop").on("dragover", event => event.preventDefault());
        html.find(".action-item-drop").on("drop", this._onDropItemReference.bind(this));
        html.find('.aptitude-select').each((i, el) => {
            const allowed = this.action.rollType === BREAK.roll_types.check.key || this.action.rollType === BREAK.roll_types.contest.key;
            if (allowed) $(el).show();
            else $(el).hide();
        });
        html.find('.vs-select').each((i, el) => {
            const allowed = this.action.rollType === BREAK.roll_types.contest.key;
            if (allowed) $(el).show();
            else $(el).hide();
        });
        this._toggleEffectFields({ currentTarget: html.find(".effect-type-select")[0] });
    }

    _toggleConditionalFields(event) {
        const html = $(this.element);
        const rollType = event.currentTarget.value;
        html.find('.aptitude-select').each((i, el) => {
            const allowed = rollType === BREAK.roll_types.check.key || rollType === BREAK.roll_types.contest.key;
            if (allowed) $(el).show();
            else $(el).hide();
        });
        html.find('.vs-select').each((i, el) => {
            const allowed = rollType === BREAK.roll_types.contest.key;
            if (allowed) $(el).show();
            else $(el).hide();
        });
    }

    _toggleEffectFields(event) {
        const html = $(this.element);
        const effectType = event.currentTarget?.value ?? BREAK.action_effects.none.key;
        const showAmount = effectType === BREAK.action_effects.heal.key || effectType === BREAK.action_effects.damage.key;
        html.find('.effect-amount-group').each((i, el) => {
            if (showAmount) $(el).show();
            else $(el).hide();
        });
    }

    async _onSubmit(event) {
        event.preventDefault();
        const updatedActions = foundry.utils.duplicate(this.item.system.actions ?? []);
        const index = updatedActions.findIndex(a => a.id === this.actionId);
        if (index === -1) return;

        updatedActions[index] = foundry.utils.mergeObject(updatedActions[index], formData);
        await this.item.update({ "system.actions": updatedActions });
    }

    async _onDropItemReference(event) {
        event.preventDefault();
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event.originalEvent ?? event);
        if (data.type !== "Item") return;
        const item = await fromUuid(data.uuid);
        if (!item) return;
        await this._updateItemReference(event.currentTarget.dataset.fieldset, item);
    }

    static async #onSelectReference(event) {
        event.preventDefault();
        const fieldset = event.target.closest("[data-fieldset]")?.dataset.fieldset;
        if (!fieldset) return;

        new FeatureSelectionDialog({
            itemType: "item",
            allowedTypes: ["item", "weapon", "armor", "shield", "accessory", "outfit"],
            document: this.item,
            picks: 1,
            title: game.i18n.localize("BREAK.FeatureSelector"),
            callback: async (picks) => {
                const [item] = picks;
                if (!item) return;
                await this._updateItemReference(fieldset, item);
            }
        }).render(true);
    }

    static async #onClearReference(event) {
        event.preventDefault();
        const fieldset = event.target.closest("[data-fieldset]")?.dataset.fieldset;
        if (!fieldset) return;
        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const idx = list.findIndex(a => a.id === this.actionId);
        if (idx === -1) return;
        const patch = fieldset === "required"
            ? { requiredItemRef: "", requiredItemName: "" }
            : { consumeItemRef: "", consumeItemName: "" };
        list[idx] = foundry.utils.mergeObject(list[idx], patch);
        await this.item.update({ "system.actions": list });
        this.action = list[idx];
        this.render(true);
    }

    static async #onOpenReference(event) {
        event.preventDefault();
        const fieldset = event.target.closest("[data-fieldset]")?.dataset.fieldset;
        if (!fieldset) return;
        const itemRef = fieldset === "required" ? this.action.requiredItemRef : this.action.consumeItemRef;
        if (!itemRef) return;
        const item = await fromUuid(itemRef);
        item?.sheet?.render(true, { editable: false });
    }

    async _updateItemReference(fieldset, item) {
        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const idx = list.findIndex(a => a.id === this.actionId);
        if (idx === -1) return;
        const itemRef = item.sourceId ?? item.flags?.core?.sourceId ?? item._stats?.compendiumSource ?? item.uuid;
        const patch = fieldset === "required"
            ? { requiredItemRef: itemRef, requiredItemName: item.name }
            : { consumeItemRef: itemRef, consumeItemName: item.name };
        list[idx] = foundry.utils.mergeObject(list[idx], patch);
        await this.item.update({ "system.actions": list });
        this.action = list[idx];
        this.render(true);
    }

    static async _handleSubmit(event, form, formData) {
        event.preventDefault();
        const updates = {
            name: formData.get("name"),
            rollType: formData.get("rollType"),
            cost: formData.get("cost"),
            description: formData.get("description") ?? "",
            aptitude: formData.get("aptitude"),
            vs: formData.get("vs"),
            target: formData.get("target"),
            requiredItemQuantity: Number(formData.get("requiredItemQuantity") || 1),
            consumeItemQuantity: Number(formData.get("consumeItemQuantity") || 1),
            effectType: formData.get("effectType") ?? BREAK.action_effects.none.key,
            effectAmount: Number(formData.get("effectAmount") || 0)
        };
        
        if(updates.rollType === BREAK.roll_types.none.key || updates.rollType === BREAK.roll_types.attack.key)
            updates.aptitude = null;

        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const idx = list.findIndex(a => a.id === this.actionId);
        if (idx === -1) return;

        list[idx] = foundry.utils.mergeObject(list[idx], updates);
        await this.item.update({ "system.actions": list });
    }
}