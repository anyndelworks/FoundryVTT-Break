import { normalizeHistoryOptions, grantHistoryOptions } from "../../utils/history-options.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export function notifyHistoryError(error) {
    console.error("BREAK history selection", error);
    const key = `BREAK.HISTORY.Errors.${error.code || "Failed"}`;
    ui.notifications.error(game.i18n.format(key, { detail: error.detail || "" }));
}

export async function describeHistoryOptions(options) {
    return Promise.all(normalizeHistoryOptions(options).map(async option => {
        const entries = await Promise.all(option.entries.map(async (entry, index) => {
            if (entry.type === "currency") {
                const label = ["coins", "gems", "stones"].filter(k => entry[k] > 0)
                    .map(k => `${entry[k]} ${game.i18n.localize(`BREAK.HISTORY.${k}`)}`).join(", ");
                return { ...entry, index, label, currency: true };
            }
            let source;
            try { source = entry.uuid ? await fromUuid(entry.uuid) : null; } catch (_) { /* Display broken links for repair. */ }
            const quantity = entry.quantity ?? source?.system?.quantity ?? 1;
            return { ...entry, index, quantity, label: entry.name || source?.name || game.i18n.localize("BREAK.HISTORY.MissingDocument"), missing: !source };
        }));
        return { ...option, displayName: option.name || entries.map(e => e.label).join(" + "), entries };
    }));
}

export class HistorySelectionDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        tag: "form",
        classes: ["break", "history-selection"],
        position: { width: 620, height: "auto" },
        window: { title: "BREAK.HISTORY.Choose", resizable: true },
        actions: { toggleChoice: this.toggleChoice },
        form: { handler: this.submitChoices, closeOnSubmit: false }
    };

    static PARTS = { choices: { template: "systems/break/templates/dialogs/history-selection.hbs" } };

    constructor(actor, history, options = {}) {
        super(options);
        this.actor = actor;
        this.history = history;
        this.selected = new Set();
        this.applying = false;
    }

    async _prepareContext() {
        const options = await describeHistoryOptions(this.history.system.startingGear);
        const picks = this.history.system.gearPicks;
        return {
            name: this.history.name,
            instruction: game.i18n.format("BREAK.HISTORY.ChooseCount", { count: picks }),
            remaining: game.i18n.format("BREAK.HISTORY.Remaining", { count: picks - this.selected.size }),
            choices: options.map(o => ({ ...o, selected: this.selected.has(o.id) })),
            applying: this.applying,
            canConfirm: !this.applying && this.selected.size === picks,
            insufficient: options.length < picks
        };
    }

    static toggleChoice(event, target) {
        if (this.applying) return;
        const id = target.dataset.choice;
        if (this.selected.has(id)) this.selected.delete(id);
        else if (this.selected.size < this.history.system.gearPicks) this.selected.add(id);
        this.render(true);
    }

    static async submitChoices(event) {
        event.preventDefault();
        if (this.applying || !this.actor.isOwner) return;
        this.applying = true;
        this.render(true);
        try {
            if (this.history.parent !== this.actor || !this.actor.items.has(this.history.id)) throw new Error("History removed");
            await grantHistoryOptions(this.actor, this.history, [...this.selected], {
                resolve: fromUuid,
                createCompanion: data => Actor.create(data),
                canCreateCompanion: () => Actor.canUserCreate(game.user)
            });
            await this.close();
        } catch (error) {
            notifyHistoryError(error);
        } finally {
            this.applying = false;
            if (this.rendered) this.render(true);
        }
    }
}
