import { RollBonuses, RollType, roll, setContestDiceColor } from "../../utils/dice.js";
import { resolveContest } from "../../utils/contest.mjs";

const { DialogV2 } = foundry.applications.api;

export class AptitudeRollDialog extends DialogV2 {
  actor;
  aptitudeId;
  targetHook = null;
  opponentUuid = null;
  rolling = false;

  static async open(actor, aptitudeId) {
    const aptitude = actor.system.aptitudes[aptitudeId];
    const dialog = new this({
      form: { closeOnSubmit: false },
      window: { title: `${actor.name}: ${game.i18n.localize(aptitude.label)}` },
      content: await foundry.applications.handlebars.renderTemplate("systems/break/templates/rolls/roll-dialog.hbs", {
        bonuses: RollBonuses, aptitude: true, opposedControls: true
      }),
      buttons: [{
        action: "roll",
        label: "BREAK.Roll",
        icon: "fa-solid fa-dice-d20",
        default: true,
        callback: async (event, button) => {
          try {
            const result = await dialog.submitRoll(button.form.elements);
            if (result) await dialog.close();
            return result;
          } catch (error) {
            console.error("BREAK contest roll", error);
            ui.notifications.error(game.i18n.localize("BREAK.CONTEST.RollFailed"));
          }
        }
      }]
    });
    dialog.actor = actor;
    dialog.aptitudeId = aptitudeId;
    return dialog.render({ force: true });
  }

  getTarget() {
    return game.user.targets.first()?.actor ?? null;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelectorAll("[name=\"rollType\"]").forEach(input => {
      input.addEventListener("change", () => this.refreshOpponent());
    });
    this.targetHook ??= Hooks.on("targetToken", user => {
      if (user.id === game.user.id) this.refreshOpponent();
    });
    this.refreshOpponent();
  }

  refreshOpponent() {
    const panel = this.element.querySelector(".contest-opponent");
    if (!panel) return;
    const target = this.getTarget();
    const contest = this.element.querySelector("[name=\"rollType\"]")?.value === RollType.CONTEST;
    panel.hidden = !contest || !target;
    panel.querySelectorAll("input, select").forEach(input => { input.disabled = panel.hidden; });
    const select = panel.querySelector("[name=\"opponentAptitude\"]");
    const previous = this.opponentUuid === target?.uuid ? select.value : this.aptitudeId;
    this.opponentUuid = target?.uuid ?? null;
    select.replaceChildren();
    if (!target) return;
    panel.querySelector("[data-opponent-name]").textContent = target.name;
    for (const [key, aptitude] of Object.entries(target.system.aptitudes ?? {})) {
      select.add(new Option(game.i18n.localize(aptitude.label), key));
    }
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
  }

  async close(options) {
    if (this.targetHook != null) Hooks.off("targetToken", this.targetHook);
    this.targetHook = null;
    return super.close(options);
  }

  async submitRoll(form) {
    if (this.rolling) return;
    const target = this.getTarget();
    const contest = form.rollType.value === RollType.CONTEST;
    if (contest && (target?.uuid ?? null) !== this.opponentUuid) {
      this.refreshOpponent();
      ui.notifications.warn(game.i18n.localize("BREAK.CONTEST.TargetChanged"));
      return;
    }
    const aptitude = this.actor.system.aptitudes[this.aptitudeId];
    const opponentAptitude = contest && target ? target.system.aptitudes?.[form.opponentAptitude.value] : null;
    if (contest && target && !opponentAptitude) {
      ui.notifications.warn(game.i18n.localize("BREAK.CONTEST.InvalidAptitude"));
      return;
    }
    // Capture both sides before evaluating dice; target hooks may update the form meanwhile.
    const rollType = form.rollType.value;
    const modifiers = [form.edge.value, form.bonus.value, form.customBonus.value];
    const opponentModifiers = opponentAptitude
      ? [form.opponentEdge.value, form.opponentBonus.value, form.opponentCustomBonus.value] : [];
    const targetValue = Number(aptitude.total);
    const opponentTargetValue = Number(opponentAptitude?.total);
    this.rolling = true;
    try {
      const flavor = game.i18n.format(contest ? "BREAK.AptitudeContest" : "BREAK.AptitudeCheck", {
        aptitude: game.i18n.localize(aptitude.label)
      });
      const left = await roll.call(this.actor, flavor, rollType, targetValue,
        ...modifiers, 0, -1, { chat: !opponentAptitude });
      if (!opponentAptitude) return left;
      const right = await roll.call(target, flavor, RollType.CONTEST, opponentTargetValue,
        ...opponentModifiers, 0, -1, { chat: false });
      const resolution = resolveContest(left, right);
      const winner = resolution.winner;
      const coloredDice = game.modules.get("dice-so-nice")?.active;
      if (coloredDice) {
        setContestDiceColor(right.rolls, "red");
      }
      const participants = [
        { ...left, name: this.actor.name, aptitude: game.i18n.localize(aptitude.label), winner: winner === "left" },
        { ...right, name: target.name, aptitude: game.i18n.localize(opponentAptitude.label), winner: winner === "right"}
      ];
      const result = winner === "draw" ? game.i18n.localize("BREAK.CONTEST.Draw")
        : game.i18n.format("BREAK.CONTEST.Winner", { name: winner === "left" ? this.actor.name : target.name });
      const reason = game.i18n.localize(`BREAK.CONTEST.${resolution.reason}`);
      return await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        rolls: [...left.rolls, ...right.rolls],
        content: await foundry.applications.handlebars.renderTemplate("systems/break/templates/rolls/contest-result.hbs", {
          participants, result, reason
        })
      }, { messageMode: game.settings.get("core", "messageMode") });
    } finally {
      this.rolling = false;
    }
  }
}
