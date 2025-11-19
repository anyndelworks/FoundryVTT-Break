import BREAK from "../constants.js";

export default class Action {
    id;
    name;
    rollType;
    cost;
    description;
    aptitude;

    constructor(name) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.rollType = BREAK.roll_types.none.key;
        this.cost = BREAK.action_costs.action.key
    }

    static async sendToChat(action, character) {
        const data = {...action};
        data.user = character;
        data.requiresRoll = action.rollType !== BREAK.roll_types.none.key;
        data.rollTypeLabel = BREAK.roll_types[action.rollType].label;
        data.costLabel = BREAK.action_costs[action.cost].label;
        if(action.aptitude)
            data.aptitudeLabel = BREAK.aptitudes[action.aptitude].label;
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