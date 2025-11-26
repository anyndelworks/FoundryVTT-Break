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

function applyContestBonus(base, target, range) {
    const difference = target-base;
    if(Math.abs(difference) >= range) {
        return Math.sign(difference)*range;
    }
    return difference;
}

function applyContestPenalty(base, target, range) {
    const difference = target-base;
    if(base > target || Math.abs(difference) < range) {
        return +range;
    }
    return -range;
}

export async function roll(flavor, rollType, targetValue, advantageType, bonusType, customBonus, statBonus = 0, extraDamage = -1) {
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
                } else if(rollType === RollType.CONTEST) {
                    if((advantageRoll.total == targetValue && baseRoll.total != targetValue) || (baseRoll.total > targetValue && advantageRoll.total < baseRoll.total) || (advantageRoll.total > baseRoll.total && advantageRoll.total < targetValue)) {
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
                } else if(rollType === RollType.CONTEST) {
                    if(advantageRoll.total != targetValue && advantageRoll.total < baseRoll.total && baseRoll.total <= targetValue) {
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
            if(rollType === RollType.CONTEST) {
                bonusTotal = applyContestBonus(definitiveRoll.total, targetValue, +bonusType);
            } else if(rollType === RollType.CHECK) {
                bonusTotal = -bonusType;
            } else {
                bonusTotal = +bonusType
            }
        } else {
            if(rollType === RollType.CONTEST) {
                bonusTotal = applyContestPenalty(definitiveRoll.total, targetValue, Math.abs(+bonusType));
            } else if(rollType === RollType.CHECK) {
                bonusTotal = -bonusType;
            } else {
                bonusTotal = +bonusType;
            }
        }
        rollFormula +=  bonusTotal > 0 ? " + " + bonusTotal : " "+bonusTotal;
    }

    let customBonusResult = 0;
    if(customBonus != "" && definitiveRoll.total != targetValue) {
        if(rollType === RollType.CONTEST) {
            customBonusResult = applyContestBonus(definitiveRoll.total+bonusTotal, targetValue, Math.abs(+customBonus));
        } else if(rollType === RollType.CHECK) {
            customBonusResult = -customBonus;
        } else {
            customBonusResult = +customBonus;
        }
        rollFormula +=  customBonusResult > 0 ? " + " + customBonusResult : " "+customBonusResult;
    }

    let resultText = "";
    if(rollType === RollType.ATTACK) {
        const rollResult = definitiveRoll.total+statBonus+bonusTotal+customBonusResult
        if(targetValue >= 0) {
            if(rollResult >= targetValue) {
                resultText = game.i18n.format("BREAK.Hit");
            } else {
                resultText = game.i18n.format("BREAK.Miss");
            }
            if(extraDamage >= 0 && rollResult > extraDamage) {
                resultText += "\n" + game.i18n.format("BREAK.ExtraAttackRollResult")
            }
        }
    } else {
        resultText = getResultText(calculateRollResult(targetValue, definitiveRoll.total, definitiveRoll.total + statBonus + bonusTotal + customBonusResult));
    }
    
    return definitiveRoll.toMessage({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: await foundry.applications.handlebars.renderTemplate("systems/break/templates/rolls/roll-check.hbs", 
        {
            isCheck: rollType === RollType.CHECK || rollType === RollType.CONTEST,
            targetValue,
            rollFormula,
            failedRoll,
            rollTotal: definitiveRoll.total + statBonus + bonusTotal + customBonusResult,
            outcome: resultText
        }),
        flavor,
    });
}