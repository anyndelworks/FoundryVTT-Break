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
}