import BREAK from "../constants.js";

export default class Action {
    id;
    name;
    rollType;
    cost;

    constructor(name) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.rollType = BREAK.roll_types.none.key;
        this.cost = BREAK.action_costs.action.key
    }

    static async sendToChat(action, character) {
        action.user = character;
        const html = await foundry.applications.handlebars.renderTemplate("systems/break/templates/chat/action.html", action);
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