import { BreakItemSheet } from "./item-sheet.js";

export class BreakHistorySheet extends BreakItemSheet {

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
            deleteGear: this.#deleteStartingGear,
            drop: this.prototype._onDrop
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
        console.log(this.DEFAULT_OPTIONS)
        const context = await super._prepareContext(options);
        context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(context.document.system.description, {
            secrets: this.document.isOwner,
            async: true
        });
        context.name = context.document.system.name;
        context.description = context.document.system.description;
        context.purviews = context.document.system.purviews ?? [];
        context.startingGear = context.document.system.startingGear ?? [];
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

    static async #deleteStartingGear(event) {
        this.document.deleteStartingGear(event);
    }
    //#endregion
    
    async updatePurview(event) {
        const element = event.currentTarget;
        const index = parseInt(element.id.split('-')[1], 10);
        this.item.system.purviews[index] = element.value;
        this.item.update({"system.purviews": this.item.system.purviews});
    }

    async _onDrop(event) {
        console.log(event);
        const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
        if (data.type !== "Item") return;
        const draggedItem = await fromUuid(data.uuid);

        const disallowedItemTypes = [
            "injury",
            "calling",
            "species",
            "homeland",
            "history",
            "quirk",
            "ability",
        ]
        if (disallowedItemTypes.includes(draggedItem.type)) return;
        
        const startingGearArray = this.item.system.startingGear ?? [];
        startingGearArray.push(draggedItem.toObject());
        this.item.update({"system.startingGear": startingGearArray});
    }

    //#region DocumentV2 submit
    static async #onSubmit(event, form, formData) {
        event.preventDefault();
        const updateData = foundry.utils.expandObject(formData.object);
        await this.item.update(updateData);
    }
    //#endregion
}
