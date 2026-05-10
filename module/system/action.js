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
            checkEffectTrigger: BREAK.action_check_effect_triggers.success.key,
            target: BREAK.action_targets.self.key,
            requiredItemRef: "",
            requiredItemName: "",
            requiredItemQuantity: 1,
            consumeItemRef: "",
            consumeItemName: "",
            consumeItemQuantity: 1,
            effectType: BREAK.action_effects.none.key,
            effectAmount: 0,
            effects: [],
            activeEffectRefs: [],
            activeEffects: [],
        }
    }

    static normalize(action) {
        const normalized = foundry.utils.deepClone(action ?? {});
        if (!Array.isArray(normalized.effects)) normalized.effects = [];
        if (!Array.isArray(normalized.activeEffectRefs)) normalized.activeEffectRefs = [];
        if (!Array.isArray(normalized.activeEffects)) normalized.activeEffects = [];
        normalized.checkEffectTrigger = normalized.checkEffectTrigger ?? BREAK.action_check_effect_triggers.success.key;
        if (!normalized.effects.length && normalized.effectType && normalized.effectType !== BREAK.action_effects.none.key) {
            const effectType = normalized.effectType === "applyItemEffects"
                ? BREAK.action_effects.applyActiveEffects.key
                : normalized.effectType;
            normalized.effects.push({
                id: crypto.randomUUID(),
                type: effectType,
                amount: Number(normalized.effectAmount) || 0
            });
        }
        return normalized;
    }

    static async getActiveEffectDocuments(action) {
        action = this.normalize(action);
        const documents = await Promise.all(action.activeEffectRefs.map(ref => fromUuid(ref).catch(() => null)));
        return documents.filter(effect => effect);
    }

    static async sendToChat(action, character) {
        action = this.normalize(action);
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
        if (action.target === BREAK.action_targets.none.key || action.target === BREAK.action_targets.area.key) return null;
        if (action.target === BREAK.action_targets.self.key) return actor;
        const target = game.user?.targets?.first?.() ?? game.users.get(game.userId)?.targets?.first?.();
        return target?.actor ?? null;
    }

    static getOwners(actor) {
        return game.users.filter(user => actor.testUserPermission(user, "OWNER"));
    }

    static getOwnerOrGMRecipients(actor) {
        const recipients = new Set(ChatMessage.getWhisperRecipients("GM").map(user => user.id));
        this.getOwners(actor).forEach(user => recipients.add(user.id));
        return Array.from(recipients);
    }

    static canRollForActor(actor) {
        return game.user.isGM || actor.testUserPermission(game.user, "OWNER");
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

    static async payCosts(actor, action) {
        if (!this.checkRequirements(actor, action)) return false;
        return this.consumeItem(actor, action.consumeItemRef, action.consumeItemName, action.consumeItemQuantity);
    }

    static shouldApplyCheckEffects(action, hit) {
        const trigger = action.checkEffectTrigger ?? BREAK.action_check_effect_triggers.success.key;
        return trigger === BREAK.action_check_effect_triggers.success.key ? hit : !hit;
    }

    static async notifyTargetCheck(actor, item, action, targetActor) {
        const aptitude = targetActor.system.aptitudes[action.aptitude];
        if(!aptitude) return;
        const data = {
            actionName: action.name,
            actorName: actor.name,
            actorUuid: actor.uuid,
            itemUuid: item.uuid,
            actionId: action.id,
            targetName: targetActor.name,
            targetActorUuid: targetActor.uuid,
            aptitude: action.aptitude,
            aptitudeLabel: game.i18n.localize(aptitude.label),
            checkEffectTrigger: action.checkEffectTrigger ?? BREAK.action_check_effect_triggers.success.key,
            resolved: false
        };
        const content = await foundry.applications.handlebars.renderTemplate("systems/break/templates/chat/action-check.html", data);
        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor }),
            whisper: this.getOwnerOrGMRecipients(targetActor),
            flavor: action.name,
            content,
            flags: {
                break: {
                    actionCheck: data
                }
            }
        });
    }

    static async applyActiveEffects(action, item, targetActor) {
        if (!targetActor) return;
        const activeEffects = await this.getActiveEffectDocuments(action);
        const effectData = activeEffects.length
            ? activeEffects.map(effect => {
                const data = effect.toObject();
                delete data._id;
                data.origin = effect.uuid;
                return data;
            })
            : action.activeEffects.map(effect => {
                const data = foundry.utils.deepClone(effect);
                delete data._id;
                data.origin = item.uuid;
                return data;
            });
        effectData.forEach(data => {
            delete data._id;
        });
        if (!effectData.length) return;
        await ActiveEffect.implementation.createDocuments(effectData, { parent: targetActor });
    }

    static async applyEffect(actor, item, action, targetActor = null) {
        action = this.normalize(action);
        const effects = action.effects.filter(effect => effect.type !== BREAK.action_effects.none.key);
        if (!effects.length) return true;

        targetActor = targetActor ?? this.getTargetActor(action, actor);
        if (!targetActor) {
            ui.notifications.warn(game.i18n.localize("BREAK.ACTION.TargetMissing"));
            return false;
        }

        for (const effect of effects) {
            switch (effect.type) {
                case BREAK.action_effects.heal.key:
                    await targetActor.modifyHp?.(Math.abs(Number(effect.amount) || 0));
                    break;
                case BREAK.action_effects.damage.key:
                    await targetActor.modifyHp?.(-Math.abs(Number(effect.amount) || 0));
                    break;
                case BREAK.action_effects.applyActiveEffects.key:
                    await this.applyActiveEffects(action, item, targetActor);
                    break;
            }
        }

        return true;
    }

    static async resolve(actor, item, action) {
        action = this.normalize(action);
        if (!await this.payCosts(actor, action)) return false;
        return this.applyEffect(actor, item, action);
    }
}
