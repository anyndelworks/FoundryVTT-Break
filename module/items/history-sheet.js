import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";
import { BreakItemSheet } from "./item-sheet.js";
import { HISTORY_ITEM_TYPES, normalizeHistoryOptions } from "../../utils/history-options.mjs";
import { describeHistoryOptions, HistorySelectionDialog } from "../dialogs/history-selection-dialog.js";

export class BreakHistorySheet extends BreakItemSheet {
    allowedItemTypes = HISTORY_ITEM_TYPES;
    static DEFAULT_OPTIONS = {
        tag: "form", classes: ["break", "sheet", "history"],
        position: { width: 760, height: 740 }, window: { resizable: true },
        form: { handler: this.submitHistory, submitOnChange: true },
        actions: {
            toggleEditable: this.onToggleEditable, editImage: this.onEditImage,
            addPurview: this.addPurview, deletePurview: this.deletePurview,
            addChoice: this.addChoice, deleteChoice: this.deleteChoice,
            pickDocument: this.pickDocument, addCurrency: this.addCurrency,
            deleteEntry: this.deleteEntry, chooseHistoryGear: this.chooseHistoryGear
        }
    };
    static PARTS = {
        header: { template: "systems/break/templates/items/shared/generic-header.hbs" },
        description: { template: "systems/break/templates/items/history/history-sheet.hbs" }
    };
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.item.system.description, { secrets: this.item.isOwner, async: true });
        context.purviews = this.item.system.purviews ?? [];
        context.choices = await describeHistoryOptions(this.item.system.startingGear);
        const actor = this.item.parent;
        context.canChooseGear = actor?.type === "character" && actor.isOwner && this.item.system.gearPicks > 0 && context.choices.length > 0 && !actor.flags?.break?.historyGrants?.[this.item.id];
        return context;
    }
    async _onRender(context, options) {
        await super._onRender(context, options);
        const choose = this.element.querySelector('[data-action="chooseHistoryGear"]');
        if (choose && context.canChooseGear) {
            choose.disabled = false;
            choose.style.removeProperty("pointer-events");
        }
    }
    async changeChoices(change) {
        if (!this._isSheetEditable()) return;
        const choices = normalizeHistoryOptions(this.item.system.startingGear);
        change(choices);
        await this.item.update({ "system.startingGear": choices });
    }
    static addChoice() {
        return this.changeChoices(choices => choices.push({ id: foundry.utils.randomID(), name: "", entries: [] }));
    }
    static deleteChoice(event, target) {
        return this.changeChoices(choices => choices.splice(Number(target.dataset.choice), 1));
    }
    static deleteEntry(event, target) {
        return this.changeChoices(choices => choices[Number(target.dataset.choice)].entries.splice(Number(target.dataset.entry), 1));
    }
    static addCurrency(event, target) {
        return this.changeChoices(choices => choices[Number(target.dataset.choice)].entries.push({ type: "currency", coins: 0, gems: 0, stones: 0 }));
    }
    async addDocument(document, choiceIndex) {
        const companion = document.documentName === "Actor" && document.type === "companion";
        const item = document.documentName === "Item" && HISTORY_ITEM_TYPES.includes(document.type);
        if (!companion && !item) return ui.notifications.warn(game.i18n.localize("BREAK.HISTORY.InvalidDrop"));
        await this.changeChoices(choices => {
            if (choiceIndex == null) {
                choiceIndex = choices.length;
                choices.push({ id: foundry.utils.randomID(), name: "", entries: [] });
            }
            choices[choiceIndex]?.entries.push({ type: companion ? "companion" : "item", uuid: document.uuid, quantity: item ? document.system.quantity ?? 1 : 1, name: "" });
        });
    }
    static pickDocument(event, target) {
        if (!this._isSheetEditable()) return;
        const companion = target.dataset.kind === "companion";
        const choiceId = normalizeHistoryOptions(this.item.system.startingGear)[Number(target.dataset.choice)]?.id;
        new FeatureSelectionDialog({
            documentType: companion ? "Actor" : "Item", itemType: companion ? "companion" : "item",
            allowedTypes: companion ? ["companion"] : HISTORY_ITEM_TYPES, document: this.item,
            callback: picks => {
                const choice = normalizeHistoryOptions(this.item.system.startingGear).findIndex(c => c.id === choiceId);
                if (choice >= 0 && picks[0]) return this.addDocument(picks[0], choice);
            }
        }).render(true);
    }
    async _onDrop(event) {
        if (!this._isSheetEditable()) return;
        event.preventDefault();
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
        if (!["Item", "Actor"].includes(data.type) || !data.uuid) return;
        const document = await fromUuid(data.uuid);
        if (!document) return;
        const row = event.target.closest("[data-history-choice]");
        await this.addDocument(document, row ? Number(row.dataset.historyChoice) : null);
    }
    static async addPurview() {
        if (this._isSheetEditable()) await this.item.update({ "system.purviews": [...this.item.system.purviews, ""] });
    }
    static async deletePurview(event, target) {
        if (!this._isSheetEditable()) return;
        const purviews = [...this.item.system.purviews];
        purviews.splice(Number(target.dataset.index), 1);
        await this.item.update({ "system.purviews": purviews });
    }
    static chooseHistoryGear() {
        const actor = this.item.parent;
        if (actor?.type === "character" && actor.isOwner) new HistorySelectionDialog(actor, this.item).render(true);
    }
    static async submitHistory(event, form, formData) {
        event.preventDefault();
        if (!this._isSheetEditable()) return;
        const update = foundry.utils.expandObject(formData.object);
        if (update.system?.purviews) update.system.purviews = Object.values(update.system.purviews);
        if (update.system?.startingGear) {
            update.system.startingGear = Object.values(update.system.startingGear).map(choice => ({
                ...choice,
                entries: Object.values(choice.entries ?? {}).map(entry => entry.type === "currency"
                    ? { ...entry, coins: Number(entry.coins), gems: Number(entry.gems), stones: Number(entry.stones) }
                    : { ...entry, quantity: Number(entry.quantity) })
            }));
        }
        await this.item.update(update);
    }
}
