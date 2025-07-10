
const { ApplicationV2 } = foundry.applications.api;
const {HandlebarsApplicationMixin} = foundry.applications.api;
export class ActiveEffectsPanel extends HandlebarsApplicationMixin(ApplicationV2) {
    get token(){
        return canvas.tokens.controlled.at(0)?.document ?? null;
    }

    get actor() {
        return this.token?.actor ?? game.user?.character ?? null;
    }

    static DEFAULT_OPTIONS = {
        ...this.DEFAULT_OPTIONS,
        tag: "article",
        id: "break-active-effects-panel",
        window: {
            frame: false
        },
        actions: {
            linkItem: this.#onLinkItem
        }
    }

    static PARTS = {
        body: {
            template: "systems/break/templates/system/active-effects-panel.hbs"
        }
    }

    async _prepareContext(options) {
        const { actor } = this;
        if (!actor) {
            return {
                effects: [],
            };
        }

        const effects = this.actor.effects;
        return {effects};
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        const html = $(this.element);
        html.find("div.effect-item").on("contextmenu", this._removeEffect.bind(this));
    }

    async _removeEffect(event) {
        event.preventDefault();
        const id = event.target.closest('[data-item-id]').dataset.itemId;
        this.actor.deleteEmbeddedDocuments("ActiveEffect", [id]);
        console.log(this.actor);
    }

    static async #onLinkItem(event) {
        const id = event.target.closest('[data-item-id]').dataset.itemId;
        const effect = this.actor.appliedEffects.find(e => e.id === id);
        const content = `
            <div class="chat-effect">
                <h2>${effect.name}</h2>
                <p><strong>Duration:</strong> ${effect.duration?.startTime || "Permanent"}</p>
                <p><strong>Description:</strong></p>
                <div>${await foundry.applications.ux.TextEditor.enrichHTML(effect.description || "No description")}</div>
            </div>
        `;

        ChatMessage.create({
            user: game.user.id,
            content
        });
    }

}
