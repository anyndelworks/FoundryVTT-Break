import BREAK from "../constants.js";
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
        position: { width: 500, height: 600 },
        tag: "form",
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
        };
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        const html = $(this.element);

        html.find(".roll-type-select").on("change", this._toggleConditionalFields.bind(this)); 
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

    async _onSubmit(event) {
        event.preventDefault();
        const updatedActions = foundry.utils.duplicate(this.item.system.actions ?? []);
        const index = updatedActions.findIndex(a => a.id === this.actionId);
        if (index === -1) return;

        updatedActions[index] = foundry.utils.mergeObject(updatedActions[index], formData);
        await this.item.update({ "system.actions": updatedActions });
    }

    static async _handleSubmit(event, form, formData) {
        event.preventDefault();
        const updates = {
            name: formData.get("name"),
            rollType: formData.get("rollType"),
            cost: formData.get("cost"),
            description: formData.get("description") ?? "",
            aptitude: formData.get("aptitude"),
            vs: formData.get("vs")
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