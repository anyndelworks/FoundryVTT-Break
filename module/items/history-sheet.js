import { FeatureSelectionDialog } from "../dialogs/feature-selection-dialog.js";
import { BreakItemSheet } from "./item-sheet.js";

export class BreakHistorySheet extends BreakItemSheet {
    allowedItemTypes = [
        "weapon",
        "shield",
        "armor",
        "accessory",
        "additive",
        "item",
        "material",
        "outfit"
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
            deleteItem: this.#onDeleteAttachedItem,
            selectFeature: this.onSelectFeature
        }
    }

    static PARTS = {
        header: {
            template: "systems/break/templates/items/shared/generic-header.hbs"
        },
        tabs: {
            template: "systems/break/templates/shared/sheet-tabs.hbs",
        },
        description: {
            template: "systems/break/templates/items/history/history-description-tab.hbs"
        },
        gear: {
            template: "systems/break/templates/items/history/history-gear-tab.hbs"
        }
    }

    static TABS = {
        primary: {
            initial: "description",
            tabs: [{id: "description", icon: "fas fa-scroll"}, {id: "gear", icon: "fas fa-sword"}],
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
        context.startingGear = await Promise.all(context.document.system.startingGear.map(async (item) => await fromUuid(item.uuid))) ?? [];
        console.log(context);
        return context;
    }

    async _onAddItem(uuid) {
        const startingGear = [...this.item.system.startingGear];
        if(startingGear.some(i => i.uuid === uuid)){
            return 
        }
        startingGear.push({
            uuid
        });
        this.item.update({"system.startingGear": startingGear});
    }
    //#endregion
  
    //#region Actions
    static #addPurview() {
        const purviews = [...this.item.system.purviews];
        purviews.push("");
        this.item.update({"system.purviews": purviews});
    }

    static #deletePurview(event) {
        event.preventDefault();
        const button = event.target;
        const index = Number(button.dataset.index);
        const purviews = [...this.item.system.purviews];
        purviews.splice(index, 1);
        this.item.update({"system.purviews": purviews});
    }

    static #onDeleteAttachedItem(event) {
        const element = event.target;
        const id = element.dataset?.id;
        if(id) {
            const startingGear = [...this.item.system.startingGear].filter(i => i.uuid !== id);
            this.item.update({"system.startingGear": startingGear});
        }
    }

    static onSelectFeature(event) {
        event.preventDefault();
        const featureType = event.target.dataset.type;
        new FeatureSelectionDialog({
            allowedTypes: this.allowedItemTypes,
            itemType: featureType,
            document: this.document,
            predefinedList: null,
            filters: [],
            callback: picks => this._onAddItem(picks[0].uuid)
        }).render(true);
    }
    //#endregion
    
    //#region Events
    _onDropValidItem(item) {
        this._onAddItem(item.uuid);
    }
    //#endregion

    //#region DocumentV2 submit
    static async #onSubmit(event, form, formData) {
        event.preventDefault();
        const updateData = foundry.utils.expandObject(formData.object);
        console.log(updateData);
        const purviews = Object.keys(updateData.system.purviews ?? {}).map((k) => {
            return updateData.system.purviews[k];
        });
        updateData.system.purviews = purviews;
        await this.item.update(updateData);
    }
    //#endregion
}
