import BREAK from "../constants.js";

export default class Action {
    id;
    name;
    rollType;
    cost;
    description;
    aptitude;

    static create(name) {
        return {
            id: crypto.randomUUID(),
            name,
            rollType: BREAK.roll_types.none.key,
            cost: BREAK.action_costs.action.key,
            description: "",
            aptitude: BREAK.aptitudes.might.key,
            vs: BREAK.aptitudes.might.key,
            target: BREAK.action_targets.self.key,
            requiredItemRef: "",
            requiredItemName: "",
            requiredItemQuantity: 1,
            consumeItemRef: "",
            consumeItemName: "",
            consumeItemQuantity: 1,
            effectType: BREAK.action_effects.none.key,
            effectAmount: 0,
        }
    }

    static async sendToChat(action, character) {
        const data = {...action};
        data.user = character;
        data.requiresRoll = action.rollType !== BREAK.roll_types.none.key;
        data.rollTypeLabel = BREAK.roll_types[action.rollType].label;
        data.costLabel = BREAK.action_costs[action.cost].label;
        const isContest = action.rollType === BREAK.roll_types.contest.key;
        const isCheck = action.rollType === BREAK.roll_types.check.key;
        if(action.aptitude && (isCheck || isContest))
            data.aptitudeLabel = BREAK.aptitudes[action.aptitude].label;
        if(action.vs && isContest)
            data.vsLabel = BREAK.aptitudes[action.vs].label;
        const html = await foundry.applications.handlebars.renderTemplate("systems/break/templates/chat/action.html", data);
        const chatData = {
            user: game.user.id,
            rollMode: game.settings.get("core", "rollMode"),
            content: html,
        }

        if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
            chatData.whisper = ChatMessage.getWhisperRecipients("GM");
        } else if (chatData.rollMode === "selfroll") {
            chatData.whisper = [game.user];
        }
        ChatMessage.create(chatData);
    }

    static getTargetActor(action, actor) {
        if (action.target === BREAK.action_targets.self.key) return actor;
        const target = game.user?.targets?.first?.() ?? game.users.get(game.userId)?.targets?.first?.();
        return target?.actor ?? null;
    }

    static itemMatchesReference(item, itemRef, itemName) {
        const normalizedName = itemName?.trim().toLowerCase();
        const sourceId = item.sourceId ?? item.flags?.core?.sourceId ?? item._stats?.compendiumSource ?? "";
        if (itemRef && (item.uuid === itemRef || sourceId === itemRef)) return true;
        if (normalizedName && item.name.trim().toLowerCase() !== normalizedName) return false;
        return Boolean(normalizedName);
    }

    static findMatchingItem(actor, itemRef, itemName, quantity = 1) {
        return actor.items.find(item => {
            if (itemRef && (item.uuid === itemRef || item.sourceId === itemRef || item.flags?.core?.sourceId === itemRef || item._stats?.compendiumSource === itemRef)) {
                const available = item.system?.quantity ?? 1;
                return available >= quantity;
            }
            if (!this.itemMatchesReference(item, itemRef, itemName)) return false;
            const available = item.system?.quantity ?? 1;
            return available >= quantity;
        }) ?? null;
    }

    static checkRequirements(actor, action) {
        if (!action.requiredItemRef && !action.requiredItemName) return true;

        const requiredQuantity = Number(action.requiredItemQuantity) || 1;
        const requiredItem = this.findMatchingItem(actor, action.requiredItemRef, action.requiredItemName, requiredQuantity);
        if (requiredItem) return true;

        const requirementLabel = action.requiredItemName || game.i18n.localize("TYPES.Item.item");
        ui.notifications.warn(game.i18n.format("BREAK.ACTION.RequirementMissing", {
            actor: actor.name,
            item: requirementLabel || game.i18n.localize("TYPES.Item.item")
        }));
        return false;
    }

    static async consumeItem(actor, itemRef, itemName, quantity = 1) {
        if (!itemRef && !itemName) return true;

        const consumeQuantity = Number(quantity) || 1;
        const item = this.findMatchingItem(actor, itemRef, itemName, consumeQuantity);
        if (!item) {
            const requirementLabel = itemName || game.i18n.localize("TYPES.Item.item");
            ui.notifications.warn(game.i18n.format("BREAK.ACTION.CostMissing", {
                actor: actor.name,
                item: requirementLabel || game.i18n.localize("TYPES.Item.item")
            }));
            return false;
        }

        const currentQuantity = item.system?.quantity ?? 1;
        if (currentQuantity <= consumeQuantity) {
            await item.delete();
        } else {
            await item.update({ "system.quantity": currentQuantity - consumeQuantity });
        }
        return true;
    }

    static async applyItemEffects(sourceItem, targetActor) {
        if (!targetActor || !sourceItem?.effects?.size) return;
        const effectData = sourceItem.effects.map(effect => {
            const data = effect.toObject();
            delete data._id;
            data.origin = sourceItem.uuid;
            return data;
        });
        if (!effectData.length) return;
        await ActiveEffect.implementation.createDocuments(effectData, { parent: targetActor });
    }

    static async applyEffect(actor, item, action) {
        if (action.effectType === BREAK.action_effects.none.key) return true;

        const targetActor = this.getTargetActor(action, actor);
        if (!targetActor) {
            ui.notifications.warn(game.i18n.localize("BREAK.ACTION.TargetMissing"));
            return false;
        }

        switch (action.effectType) {
            case BREAK.action_effects.heal.key:
                await targetActor.modifyHp?.(Math.abs(Number(action.effectAmount) || 0));
                return true;
            case BREAK.action_effects.damage.key:
                await targetActor.modifyHp?.(-Math.abs(Number(action.effectAmount) || 0));
                return true;
            case BREAK.action_effects.applyItemEffects.key:
                await this.applyItemEffects(item, targetActor);
                return true;
        }

        return true;
    }

    static async resolve(actor, item, action) {
        if (!this.checkRequirements(actor, action)) return false;
        if (!await this.consumeItem(actor, action.consumeItemRef, action.consumeItemName, action.consumeItemQuantity)) return false;
        return this.applyEffect(actor, item, action);
    }
}
