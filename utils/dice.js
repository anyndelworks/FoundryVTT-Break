import { getContestModifiers, resolveContest, resolveContestDie } from "./contest.mjs";

export const RollResults = {
    SUCCESS: "0",
    FAILURE: "1",
    AUTOMATIC_FAILURE: "2",
    SPECIAL_SUCCESS: "3"
}

export const RollBonuses = {
    NONE: "0",
    MINOR_BONUS: "2",
    MAJOR_BONUS: "4",
    MINOR_PENALTY: "-2",
    MAJOR_PENALTY: "-4"
}

export const AdvantageTypes = {
    NONE: "0",
    EDGE: "1",
    SNAG: "2"
}

export const RollType = {
    CHECK: "0",
    CONTEST: "1",
    ATTACK: "2"
}

export function calculateRollResult(targetValue, rollBase, rollTotal){
    if(targetValue == rollBase) {
        return RollResults.SPECIAL_SUCCESS;
    }
    if(rollTotal <= targetValue) {
        return RollResults.SUCCESS;
    }
    if(rollBase === 20) {
        return RollResults.AUTOMATIC_FAILURE;
    }
    return RollResults.FAILURE;
}

export function getResultText(result){
    switch(result){
        case RollResults.AUTOMATIC_FAILURE:
            return game.i18n.format("BREAK.AutomaticFailure");
        case RollResults.FAILURE:
            return game.i18n.format("BREAK.Failure");
        case RollResults.SUCCESS:
            return game.i18n.format("BREAK.Success");
       case RollResults.SPECIAL_SUCCESS:
            return game.i18n.format("BREAK.SpecialSuccess");
    }
}

export async function roll(flavor, rollType, targetValue, advantageType, bonusType, customBonus, statBonus = 0, extraDamage = -1, options = {}) {
    if (rollType === RollType.CONTEST) {
        return rollContest.call(this, flavor, targetValue, advantageType, bonusType, customBonus, statBonus, options);
    }
    let rollFormula = "1d20";
    const baseRoll = new Roll("1d20")
    await baseRoll.evaluate();
    rollFormula = `${baseRoll.total}`;

    let definitiveRoll = baseRoll;
    let failedRoll = null;

    if(advantageType != "") {
        const advantageRoll = new Roll("1d20");
        await advantageRoll.evaluate();
        failedRoll = advantageRoll;
        switch(advantageType) {
            case AdvantageTypes.EDGE:
                if(rollType === RollType.CHECK) {
                    if((advantageRoll.total == targetValue || advantageRoll.total < baseRoll.total) && baseRoll.total != targetValue) {
                        definitiveRoll = advantageRoll;
                        failedRoll = baseRoll;
                        rollFormula = `${advantageRoll.total}`
                    }
                } else {
                    if(advantageRoll.total > baseRoll.total) {
                        definitiveRoll = advantageRoll;
                        failedRoll = baseRoll;
                        rollFormula = `${advantageRoll.total}`
                    }
                }
                break;
            case AdvantageTypes.SNAG:
                if(rollType === RollType.CHECK) {
                    if(advantageRoll.total > baseRoll.total && advantageRoll.total != targetValue) {
                        definitiveRoll = advantageRoll;
                        failedRoll = baseRoll;
                        rollFormula = `${advantageRoll.total}`
                    }
                } else {
                    if(advantageRoll.total < baseRoll.total){
                        definitiveRoll = advantageRoll;
                        failedRoll = baseRoll;
                        rollFormula = `${advantageRoll.total}`
                    }
                }
                break;
        }
    }

    if(statBonus != 0) {
        rollFormula += statBonus > 0 ? " + " + statBonus : " "+statBonus;
    }

    let bonusTotal = 0;
    if(bonusType != "" && definitiveRoll.total !== targetValue) {
        if(bonusType === RollBonuses.MINOR_BONUS || bonusType === RollBonuses.MAJOR_BONUS) {
            if(rollType === RollType.CHECK) {
                bonusTotal = -bonusType;
            } else {
                bonusTotal = +bonusType
            }
        } else {
            if(rollType === RollType.CHECK) {
                bonusTotal = -bonusType;
            } else {
                bonusTotal = +bonusType;
            }
        }
        rollFormula +=  bonusTotal > 0 ? " + " + bonusTotal : " "+bonusTotal;
    }

    let customBonusResult = 0;
    if(customBonus != "" && definitiveRoll.total != targetValue) {
        if(rollType === RollType.CHECK) {
            customBonusResult = -customBonus;
        } else {
            customBonusResult = +customBonus;
        }
        rollFormula +=  customBonusResult > 0 ? " + " + customBonusResult : " "+customBonusResult;
    }

    let resultText = "";
    let hit = null;
    let extraDamageHit = null;
    if(rollType === RollType.ATTACK) {
        const rollResult = definitiveRoll.total+statBonus+bonusTotal+customBonusResult
        if(targetValue >= 0) {
            hit = rollResult >= targetValue;
            if(hit) {
                resultText = game.i18n.format("BREAK.Hit");
            } else {
                resultText = game.i18n.format("BREAK.Miss");
            }
            extraDamageHit = extraDamage > 0 && rollResult >= extraDamage;
            if(extraDamageHit) {
                resultText += "\n" + game.i18n.format("BREAK.ExtraAttackRollResult")
            }
        }
    } else {
        const result = calculateRollResult(targetValue, definitiveRoll.total, definitiveRoll.total + statBonus + bonusTotal + customBonusResult);
        hit = result === RollResults.SUCCESS || result === RollResults.SPECIAL_SUCCESS;
        resultText = getResultText(result);
    }
    
    const details = { hit, extraDamageHit, targetValue, rollFormula, failedRoll,
        rollTotal: definitiveRoll.total + statBonus + bonusTotal + customBonusResult,
        outcome: resultText, rolls: [definitiveRoll, ...(failedRoll ? [failedRoll] : [])] };
    if (options.chat === false) return details;

    const message = await ChatMessage.create({
        user: game.user.id,
        rolls: details.rolls,
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: await foundry.applications.handlebars.renderTemplate("systems/break/templates/rolls/roll-check.hbs", 
        {
            isCheck: rollType === RollType.CHECK,
            targetValue,
            rollFormula,
            failedRoll,
            rollTotal: definitiveRoll.total + statBonus + bonusTotal + customBonusResult,
            outcome: resultText
        }),
        flavor,
    }, { messageMode: game.settings.get("core", "messageMode") });
    
    return { ...details, message };
}

async function rollContest(flavor, targetValue, advantageType, bonusType, customBonus, statBonus, options) {
    if (!Number.isFinite(targetValue)) throw new Error("Invalid Contest target");
    const config = {
        ...getContestModifiers([bonusType, customBonus, statBonus]),
        edge: advantageType === AdvantageTypes.EDGE
    };

    const first = await new Roll("1d20").evaluate();
    let selected = first;
    let failedRoll = null;
    let details = resolveContestDie(first.total, targetValue, config);
    if ([AdvantageTypes.EDGE, AdvantageTypes.SNAG].includes(advantageType)) {
        const second = await new Roll("1d20").evaluate();
        const candidate = resolveContestDie(second.total, targetValue, config);
        const preferred = resolveContest(candidate, details).winner;
        const chooseSecond = advantageType === AdvantageTypes.EDGE ? preferred === "left" : preferred === "right";
        failedRoll = chooseSecond ? first : second;
        if (chooseSecond) {
            selected = second;
            details = candidate;
        }
    }

    const result = details.special ? RollResults.SPECIAL_SUCCESS : details.hit ? RollResults.SUCCESS
        : details.naturalRoll === 20 ? RollResults.AUTOMATIC_FAILURE : RollResults.FAILURE;
    const changes = [details.bonusApplied, details.penaltyApplied].filter(Boolean)
        .map(value => value > 0 ? ` + ${value}` : ` - ${Math.abs(value)}`).join("");
    Object.assign(details, { rollFormula: `${details.naturalRoll}${changes}`, outcome: getResultText(result),
        advantageLabel: advantageType === AdvantageTypes.EDGE ? "BREAK.Edge"
            : advantageType === AdvantageTypes.SNAG ? "BREAK.Snag" : null,
        failedRoll, rolls: [selected, ...(failedRoll ? [failedRoll] : [])], extraDamageHit: null });
    if (options.chat === false) return details;

    const message = await ChatMessage.create({
        user: game.user.id, speaker: ChatMessage.getSpeaker({ actor: this }), flavor,
        rolls: details.rolls,
        content: await foundry.applications.handlebars.renderTemplate("systems/break/templates/rolls/roll-check.hbs", details)
    }, { messageMode: game.settings.get("core", "messageMode") });

    return { ...details, message };
}

export function setContestDiceColor(rolls, colorset) {
    for (const roll of rolls) {
        for (const die of roll.dice) {
            die.options.colorset = colorset;
            die.options.appearance = { ...die.options.appearance, system: "standard" };
        }
    }
}
