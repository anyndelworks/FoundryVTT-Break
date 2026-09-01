import BREAK from "../constants.js";
import Action from "../system/action.js";
import { FeatureSelectionDialog } from "./feature-selection-dialog.js";
const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;
export default class ActionFormDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(item, actionId, options = {}) {
        super(options);
        this.item = item;
        this.actionId = actionId;
        this.selectedVariantId = options.rankVariantId ?? null;
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
            addActionEffect: this.#onAddActionEffect,
            deleteActionEffect: this.#onDeleteActionEffect,
            clearActionEffectMacro: this.#onClearActionEffectMacro,
            deleteActionActiveEffect: this.#onDeleteActionActiveEffect,
            selectRankVariant: this.#onSelectRankVariant,
            addRankVariant: this.#onAddRankVariant,
            deleteRankVariant: this.#onDeleteRankVariant,
        }
    };

    static PARTS = {
        form: {
            template: 'systems/break/templates/system/action-sheet.hbs'
        }
    }

    async _prepareContext() {        
        const action = await this.#getNormalizedAction();
        const baseAction = Action.normalize(this.action);
        const usedRanks = new Set(baseAction.rankVariants.map(variant => Number(variant.minRank)));
        const rankOptions = Array.from({ length: BREAK.max_rank - 1 }, (_, index) => index + 2)
            .filter(rank => !usedRanks.has(rank));
        return {
            item: this.item,
            action,
            rollTypes: BREAK.roll_types,
            costs: BREAK.action_costs,
            checkEffectTriggers: BREAK.action_check_effect_triggers,
            aptitudes: BREAK.aptitudes,
            targets: BREAK.action_targets,
            effects: Object.fromEntries(Object.entries(BREAK.action_effects)
                .filter(([, effect]) => effect.key !== BREAK.action_effects.applyActiveEffects.key)),
            requiredItemLabel: action.requiredItemName || game.i18n.localize("BREAK.None"),
            consumeItemLabel: action.consumeItemName || game.i18n.localize("BREAK.None"),
            rankVariants: baseAction.rankVariants
                .sort((a, b) => Number(a.minRank) - Number(b.minRank))
                .map(variant => ({
                    ...variant,
                    active: variant.id === this.selectedVariantId,
                })),
            editingBase: !this.selectedVariantId,
            selectedVariantId: this.selectedVariantId,
            rankOptions,
            canAddRankVariant: rankOptions.length > 0,
        };
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        const html = $(this.element);

        html.find(".roll-type-select").on("change", this._toggleConditionalFields.bind(this));
        html.find(".effect-type-select").on("change", async event => {
            this._toggleEffectFields(event);
            await this._onEffectInputChange(event);
        });
        html.find(".action-effect-amount").on("change", this._onEffectInputChange.bind(this));
        html.find(".action-macro-drop").on("dragover", event => event.preventDefault());
        html.find(".action-macro-drop").on("drop", this._onDropMacro.bind(this));
        html.find(".action-item-drop").on("dragover", event => event.preventDefault());
        html.find(".action-item-drop").on("drop", this._onDropItemReference.bind(this));
        html.find(".action-active-effect-drop").on("dragover", event => event.preventDefault());
        html.find(".action-active-effect-drop").on("drop", this._onDropActiveEffect.bind(this));
        html.find('.aptitude-select').each((i, el) => {
            const allowed = context.action.rollType === BREAK.roll_types.check.key || context.action.rollType === BREAK.roll_types.contest.key;
            if (allowed) $(el).show();
            else $(el).hide();
        });
        html.find('.vs-select').each((i, el) => {
            const allowed = context.action.rollType === BREAK.roll_types.contest.key;
            if (allowed) $(el).show();
            else $(el).hide();
        });
        html.find('.check-trigger-select').each((i, el) => {
            const allowed = context.action.rollType === BREAK.roll_types.check.key;
            if (allowed) $(el).show();
            else $(el).hide();
        });
        html.find(".effect-type-select").each((i, el) => this._toggleEffectFields({ currentTarget: el }));
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
        html.find('.check-trigger-select').each((i, el) => {
            const allowed = rollType === BREAK.roll_types.check.key;
            if (allowed) $(el).show();
            else $(el).hide();
        });
    }

    _toggleEffectFields(event) {
        const html = $(this.element);
        const effectType = event.currentTarget?.value ?? BREAK.action_effects.none.key;
        const effectRow = event.currentTarget.closest("[data-action-effect]");
        const showAmount = effectType === BREAK.action_effects.heal.key || effectType === BREAK.action_effects.damage.key;
        const showMacro = effectType === BREAK.action_effects.executeMacro.key;
        $(effectRow ?? html).find('.effect-amount-group').each((i, el) => {
            if (showAmount) $(el).show();
            else $(el).hide();
        });
        $(effectRow ?? html).find('.effect-macro-group').each((i, el) => {
            if (showMacro) $(el).show();
            else $(el).hide();
        });
    }

    #getActionTarget(action) {
        if (!this.selectedVariantId) return action;
        return (action.rankVariants ?? []).find(variant => variant.id === this.selectedVariantId) ?? action;
    }

    #getListTarget(list) {
        const action = list.find(candidate => candidate.id === this.actionId);
        return action ? this.#getActionTarget(action) : null;
    }

    async #saveCurrentForm() {
        if (!this.element) return;
        const formData = new FormDataExtended(this.element);
        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const target = this.#getListTarget(list);
        if (!target) return;
        foundry.utils.mergeObject(target, this.getFormUpdates(formData));
        await this.item.update({ "system.actions": list });
        this.action = list.find(action => action.id === this.actionId);
    }

    async _onEffectInputChange(event) {
        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const target = this.#getListTarget(list);
        if (!target) return;
        const effects = this.#getEffectUpdates();
        foundry.utils.mergeObject(target, {
            effectType: effects[0]?.type ?? BREAK.action_effects.none.key,
            effectAmount: effects[0]?.amount ?? 0,
            effects,
        });
        await this.item.update({ "system.actions": list });
        this.action = list.find(action => action.id === this.actionId);
    }

    getFormUpdates(formData) {
        const data = foundry.utils.expandObject(formData.object ?? {});
        const effects = this.#getEffectUpdates();
        const updates = {
            name: data.name,
            rollType: data.rollType,
            cost: data.cost,
            description: data.description ?? "",
            aptitude: data.aptitude,
            vs: data.vs,
            checkEffectTrigger: data.checkEffectTrigger ?? BREAK.action_check_effect_triggers.success.key,
            target: data.target,
            requiredItemQuantity: Number(data.requiredItemQuantity || 1),
            consumeItemQuantity: Number(data.consumeItemQuantity || 1),
            effectType: effects[0]?.type ?? BREAK.action_effects.none.key,
            effectAmount: effects[0]?.amount ?? 0,
            effects,
        };

        if(updates.rollType === BREAK.roll_types.none.key || updates.rollType === BREAK.roll_types.attack.key)
            updates.aptitude = null;

        return updates;
    }

    #getEffectUpdates() {
        return Array.from(this.element.querySelectorAll("[data-action-effect]")).map(row => ({
            id: row.dataset.effectId || crypto.randomUUID(),
            type: row.querySelector("[name='effectType']")?.value ?? BREAK.action_effects.none.key,
            amount: Number(row.querySelector("[name='effectAmount']")?.value || 0),
            macroUuid: row.querySelector("[name='macroUuid']")?.value ?? "",
            macroName: row.querySelector("[name='macroName']")?.value ?? ""
        }));
    }

    async #getNormalizedAction() {
        const action = Action.normalize(this.#getActionTarget(Action.normalize(this.action)));
        const activeEffectCopies = foundry.utils.deepClone(action.activeEffects ?? []);
        const activeEffectDocuments = await Action.getActiveEffectDocuments(action);
        action.activeEffects = activeEffectDocuments.map((effect, index) => ({
            name: effect.name,
            img: effect.img,
            uuid: effect.uuid,
            _actionIndex: index,
            _actionRef: effect.uuid
        }));
        if (!action.activeEffects.length) {
            action.activeEffects = activeEffectCopies.map((effect, index) => ({
                ...effect,
                _actionIndex: index
            }));
        }
        return action;
    }

    async _onDropItemReference(event) {
        event.preventDefault();
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event.originalEvent ?? event);
        if (data.type !== "Item") return;
        const item = await fromUuid(data.uuid);
        if (!item) return;
        await this._updateItemReference(event.currentTarget.dataset.fieldset, item);
    }

    async _onDropActiveEffect(event) {
        event.preventDefault();
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event.originalEvent ?? event);
        if (data.type !== "ActiveEffect") return;
        const effect = await fromUuid(data.uuid);
        if (!effect) return;

        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const target = this.#getListTarget(list);
        if (!target) return;
        target.activeEffectRefs = target.activeEffectRefs ?? [];
        if (!target.activeEffectRefs.includes(effect.uuid)) target.activeEffectRefs.push(effect.uuid);
        await this.item.update({ "system.actions": list });
        this.action = list.find(action => action.id === this.actionId);
        this.render(true);
    }

    async _onDropMacro(event) {
        event.preventDefault();
        const row = event.currentTarget.closest("[data-action-effect]");
        const effectId = row?.dataset.effectId;
        if (!effectId) return;
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event.originalEvent ?? event);
        if (data.type !== "Macro") return;
        const macroUuid = data.uuid ?? data.documentUuid;
        if (!macroUuid) return;
        const macro = await fromUuid(macroUuid);
        if (!macro) return;

        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const target = this.#getListTarget(list);
        if (!target) return;
        const effect = (target.effects ?? []).find(effect => effect.id === effectId);
        if (!effect) return;
        effect.macroUuid = macro.uuid;
        effect.macroName = macro.name;
        await this.item.update({ "system.actions": list });
        this.action = list.find(action => action.id === this.actionId);
        this.render(true);
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
        const target = this.#getListTarget(list);
        if (!target) return;
        const patch = fieldset === "required"
            ? { requiredItemRef: "", requiredItemName: "" }
            : { consumeItemRef: "", consumeItemName: "" };
        foundry.utils.mergeObject(target, patch);
        await this.item.update({ "system.actions": list });
        this.action = list.find(action => action.id === this.actionId);
        this.render(true);
    }

    static async #onOpenReference(event) {
        event.preventDefault();
        const fieldset = event.target.closest("[data-fieldset]")?.dataset.fieldset;
        if (!fieldset) return;
        const action = this.#getActionTarget(this.action);
        const itemRef = fieldset === "required" ? action.requiredItemRef : action.consumeItemRef;
        if (!itemRef) return;
        const item = await fromUuid(itemRef);
        item?.sheet?.render(true, { editable: false });
    }

    static async #onAddActionEffect(event) {
        event.preventDefault();
        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const target = this.#getListTarget(list);
        if (!target) return;
        target.effects = target.effects ?? [];
        target.effects.push({
            id: crypto.randomUUID(),
            type: BREAK.action_effects.none.key,
            amount: 0,
            macroUuid: "",
            macroName: ""
        });
        await this.item.update({ "system.actions": list });
        this.action = list.find(action => action.id === this.actionId);
        this.render(true);
    }

    static async #onDeleteActionEffect(event) {
        event.preventDefault();
        const row = event.target.closest("[data-action-effect]");
        const effectId = row?.dataset.effectId;
        if (!effectId) return;
        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const target = this.#getListTarget(list);
        if (!target) return;
        target.effects = (target.effects ?? []).filter(effect => effect.id !== effectId);
        target.effectType = target.effects[0]?.type ?? BREAK.action_effects.none.key;
        target.effectAmount = target.effects[0]?.amount ?? 0;
        await this.item.update({ "system.actions": list });
        this.action = list.find(action => action.id === this.actionId);
        this.render(true);
    }

    static async #onClearActionEffectMacro(event) {
        event.preventDefault();
        const row = event.target.closest("[data-action-effect]");
        const effectId = row?.dataset.effectId;
        if (!effectId) return;
        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const target = this.#getListTarget(list);
        if (!target) return;
        const effect = (target.effects ?? []).find(effect => effect.id === effectId);
        if (!effect) return;
        effect.macroUuid = "";
        effect.macroName = "";
        await this.item.update({ "system.actions": list });
        this.action = list.find(action => action.id === this.actionId);
        this.render(true);
    }

    static async #onDeleteActionActiveEffect(event) {
        event.preventDefault();
        const row = event.target.closest("[data-active-effect-index]");
        const index = Number(row?.dataset.activeEffectIndex);
        const ref = row?.dataset.activeEffectRef;
        if (Number.isNaN(index) && !ref) return;
        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const target = this.#getListTarget(list);
        if (!target) return;
        target.activeEffectRefs = ref
            ? (target.activeEffectRefs ?? []).filter(effectRef => effectRef !== ref)
            : (target.activeEffectRefs ?? []).filter((effectRef, i) => i !== index);
        target.activeEffects = (target.activeEffects ?? []).filter((effect, i) => i !== index);
        await this.item.update({ "system.actions": list });
        this.action = list.find(action => action.id === this.actionId);
        this.render(true);
    }

    async _updateItemReference(fieldset, item) {
        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const target = this.#getListTarget(list);
        if (!target) return;
        const itemRef = item.sourceId ?? item.flags?.core?.sourceId ?? item._stats?.compendiumSource ?? item.uuid;
        const patch = fieldset === "required"
            ? { requiredItemRef: itemRef, requiredItemName: item.name }
            : { consumeItemRef: itemRef, consumeItemName: item.name };
        foundry.utils.mergeObject(target, patch);
        await this.item.update({ "system.actions": list });
        this.action = list.find(action => action.id === this.actionId);
        this.render(true);
    }

    static async #onSelectRankVariant(event, target) {
        event.preventDefault();
        await this.#saveCurrentForm();
        this.selectedVariantId = (target ?? event.target).dataset.variantId || null;
        this.render(true);
    }

    static async #onAddRankVariant(event) {
        event.preventDefault();
        const rank = Number(this.element.querySelector(".rank-variant-rank")?.value);
        if (!Number.isInteger(rank) || rank < 2 || rank > BREAK.max_rank) return;

        await this.#saveCurrentForm();
        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const action = list.find(candidate => candidate.id === this.actionId);
        if (!action) return;
        action.rankVariants = action.rankVariants ?? [];
        if (action.rankVariants.some(variant => Number(variant.minRank) === rank)) {
            ui.notifications.warn(game.i18n.localize("BREAK.ACTION.RankAlreadyUsed"));
            return;
        }

        const variant = Action.createRankVariant(action, rank);
        action.rankVariants.push(variant);
        action.rankVariants.sort((a, b) => Number(a.minRank) - Number(b.minRank));
        await this.item.update({ "system.actions": list });
        this.action = action;
        this.selectedVariantId = variant.id;
        this.render(true);
    }

    static async #onDeleteRankVariant(event) {
        event.preventDefault();
        if (!this.selectedVariantId) return;
        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const action = list.find(candidate => candidate.id === this.actionId);
        if (!action) return;
        action.rankVariants = (action.rankVariants ?? [])
            .filter(variant => variant.id !== this.selectedVariantId);
        await this.item.update({ "system.actions": list });
        this.action = action;
        this.selectedVariantId = null;
        this.render(true);
    }

    static async _handleSubmit(event, form, formData) {
        event.preventDefault();
        const updates = this.getFormUpdates(formData);

        const list = foundry.utils.duplicate(this.item.system.actions ?? []);
        const target = this.#getListTarget(list);
        if (!target) return;

        foundry.utils.mergeObject(target, updates);
        await this.item.update({ "system.actions": list });
    }
}
