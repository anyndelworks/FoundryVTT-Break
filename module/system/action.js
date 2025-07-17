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
}