import { BreakItemSheet } from "./item-sheet.js";

export class BreakHistorySheet extends BreakItemSheet {
    allowedItemTypes = [
        "weapon",
        "shield",
        "armor",
        "item"
    ];
    //#region DocumentV2 initialization and setup
    static DEFAULT_OPTIONS = {
        ...this.DEFAULT_OPTIONS,
        tag: "form",
        classes: ["break", "sheet", "history"],
        position: {
            width: 600,
            height: 480,
        },
        form: {
            handler: BreakHistorySheet.#onSubmit,
            submitOnChange: true
        },
        window: {
            resizable: true
        },
        actions: {
            editImage: this.onEditImage,
            addPurview: this.#addPurview,
            deletePurview: this.#deletePurview,
            deleteItem: this.#onDeleteAttachedItem
        }
    }

    static PARTS = {
        header: {
            template: "systems/break/templates/items/shared/generic-header.hbs"
        },
        body: {
            template: "systems/break/templates/items/history/history-sheet.hbs"
        }
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
            secrets: this.document.isOwner,
            async: true
        });
        context.name = context.document.system.name;
        context.description = context.document.system.description;
        context.purviews = context.document.system.purviews ?? [];
        context.startingGear = await Promise.all(context.document.system.startingGear.map(async (id) => await fromUuid(id))) ?? [];
        return context;
    }
    //#endregion
  
    //#region Actions
    static async #addPurview() {
        this.item.system.purviews.push("");
        this.item.update({"system.purviews": this.item.system.purviews});
    }

    static async #deletePurview(event) {
        event.preventDefault();
        const index = parseInt(event.target.id);
        this.item.system.purviews.splice(index, 1);
        this.item.update({"system.purviews": this.item.system.purviews});
    }

    static async #onDeleteAttachedItem(event) {
        const element = event.target;
        const id = element.dataset?.id;
        if(id) {
            const startingGear = this.item.system.startingGear.filter(uuid => {
                const split = uuid.split(".");
                return split[split.length-1] !== id;
            });
            this.item.update({"system.startingGear": startingGear});
        }
    }
    //#endregion
    
    //#region Events
    async updatePurview(event) {
        const element = event.currentTarget;
        const index = parseInt(element.id.split('-')[1], 10);
        this.item.system.purviews[index] = element.value;
        this.item.update({"system.purviews": this.item.system.purviews});
    }

    _onDropValidItem(item) {
        const startingGear = this.item.system.startingGear;
        if(!startingGear.includes(item.uuid)) {
            startingGear.push(item.uuid);
            this.item.update({"system.startingGear": startingGear});
        }
    }
    //#endregion

    //#region DocumentV2 submit
    static async #onSubmit(event, form, formData) {
        event.preventDefault();
        const updateData = foundry.utils.expandObject(formData.object);
        await this.item.update(updateData);
    }
    //#endregion
}
