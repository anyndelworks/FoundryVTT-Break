import BREAK from "../constants.js";

export const CONTAINER_ITEM_TYPES = [
    "accessory",
    "ammo",
    "armor",
    "item",
    "outfit",
    "shield",
    "weapon"
];

export const CONTAINER_ITEM_CATEGORIES = [
    "wayfinding",
    "illumination",
    "kit",
    "book",
    "consumable",
    "combustible",
    "miscellaneous",
    "curiosity",
    "otherworldly",
    "material",
    "additive"
];

export const ContainerCapableMixin = Base => class extends Base {
    static defineSchema() {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            container: new fields.SchemaField({
                enabled: new fields.BooleanField({ initial: false }),
                capacity: new fields.NumberField({ initial: 0, min: 0 }),
                accessCost: new fields.StringField({
                    initial: "free",
                    choices: ["free", "action"]
                }),
                allowedItemTypes: new fields.ArrayField(new fields.StringField(), { initial: [] }),
                allowedItemCategories: new fields.ArrayField(new fields.StringField(), { initial: [] })
            })
        };
    }

    get isContainer() {
        return this.container.enabled;
    }
};

export function canStoreItem(container, item) {
    if (!container?.system?.container?.enabled || container.id === item?.id) return false;
    if (item?.system?.container?.enabled) return false;

    const allowedTypes = container.system.container.allowedItemTypes ?? [];
    const allowedCategories = container.system.container.allowedItemCategories ?? [];
    if (!allowedTypes.length && !allowedCategories.length) return true;

    return allowedTypes.includes(item.type)
        || (item.type === "item" && allowedCategories.includes(item.system.type));
}

export function getItemSlots(item) {
    return Number(item?.system?.slots ?? 0) * Number(item?.system?.quantity ?? 1);
}

export function getContainerUsedSlots(actor, containerId, excludedItemId = null) {
    return actor.items
        .filter(item => item.id !== excludedItemId && item.system.containerId === containerId)
        .reduce((total, item) => total + getItemSlots(item), 0);
}

export function prepareContainerContext(context) {
    context.canBeContainer = true;
    context.containerAccessCosts = ["free", "action"].map(key => ({
        key,
        label: `BREAK.CONTAINER.Access.${key}`,
        active: context.document.system.container.accessCost === key
    }));
    context.containerItemTypes = CONTAINER_ITEM_TYPES.map(type => ({
        key: type,
        label: `TYPES.Item.${type}`,
        active: context.document.system.container.allowedItemTypes.includes(type)
    }));
    context.containerItemCategories = CONTAINER_ITEM_CATEGORIES.map(category => ({
        key: category,
        label: BREAK.item_types[category],
        active: context.document.system.container.allowedItemCategories.includes(category)
    }));
}

export function prepareContainerSubmitData(updateData) {
    const container = updateData.system?.container;
    if (!container) return;

    container.enabled = container.enabled === true || container.enabled === "true" || container.enabled === "on";
    if ("capacity" in container) container.capacity = Number(container.capacity ?? 0);
    if ("allowedItemTypes" in container) {
        container.allowedItemTypes = normalizeSelection(container.allowedItemTypes);
    }
    if ("allowedItemCategories" in container) {
        container.allowedItemCategories = normalizeSelection(container.allowedItemCategories);
    }
}

function normalizeSelection(selection) {
    if (Array.isArray(selection)) return selection.filter(value => value);
    if (selection == null || selection === "") return [];
    return [selection];
}
