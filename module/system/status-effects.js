const STATUS_FLAG = "showAsStatus";

export function registerStatusEffects() {
  Hooks.on("renderActiveEffectConfig", addStatusFlagField);
  Hooks.once("ready", async () => {
    game.break.rebuildStatusEffects = rebuildStatusEffects;
    await rebuildStatusEffects();
  });

  Hooks.on("createActiveEffect", effect => {
    if (effect.getFlag("break", STATUS_FLAG)) scheduleStatusEffectRebuild();
  });
  Hooks.on("updateActiveEffect", (effect, changed) => {
    if (effect.getFlag("break", STATUS_FLAG)
      || foundry.utils.hasProperty(changed, `flags.break.${STATUS_FLAG}`)) {
      scheduleStatusEffectRebuild();
    }
  });
  Hooks.on("deleteActiveEffect", effect => {
    if (effect.getFlag("break", STATUS_FLAG)) scheduleStatusEffectRebuild();
  });
}

export async function rebuildStatusEffects() {
  const effects = await collectStatusEffects();
  const statuses = new Map();

  for (const effect of effects) {
    if (!effect.getFlag("break", STATUS_FLAG)) continue;
    const [id, config] = createStatusEffectConfig(effect);
    if (!statuses.has(id)) statuses.set(id, config);
  }

  CONFIG.statusEffects = Object.fromEntries(statuses);
  canvas.tokens?.hud?.render?.();
}

async function collectStatusEffects() {
  const effects = [];
  const packs = game.packs.filter(pack => pack.documentName === "ActiveEffect");
  const packedEffects = await Promise.all(packs.map(async pack => {
    try {
      return await pack.getDocuments();
    } catch (error) {
      console.warn(`BREAK | Could not read Active Effects from ${pack.collection}.`, error);
      return [];
    }
  }));
  effects.push(...packedEffects.flat());

  for (const actor of game.actors) {
    effects.push(...actor.effects);
    for (const item of actor.items) effects.push(...item.effects);
  }
  for (const item of game.items) effects.push(...item.effects);

  return effects;
}

function createStatusEffectConfig(effect) {
  const effectStatuses = Array.from(effect.statuses ?? []);
  const id = effect.getFlag("break", "statusId")
    ?? effectStatuses[0]
    ?? effect.name.slugify({ strict: true });

  return [id, {
    id,
    name: effect.name,
    img: effect.img,
    hud: true,
    statuses: [id],
    description: effect.description ?? "",
    changes: foundry.utils.deepClone(effect.changes ?? []),
    tint: effect.tint,
    showIcon: effect.showIcon,
    flags: foundry.utils.deepClone(effect.flags ?? {})
  }];
}

function addStatusFlagField(application, element) {
  if (element.querySelector("[data-break-status-flag]")) return;

  const details = element.querySelector('.tab[data-tab="details"]');
  if (!details) return;

  const field = document.createElement("div");
  field.classList.add("form-group");
  field.dataset.breakStatusFlag = "";
  field.innerHTML = `
    <label>${game.i18n.localize("BREAK.STATUS.ShowAsStatus")}</label>
    <div class="form-fields">
      <input type="hidden" name="flags.break.${STATUS_FLAG}" value="false">
      <input type="checkbox" name="flags.break.${STATUS_FLAG}" value="true"
        ${application.document.getFlag("break", STATUS_FLAG) ? "checked" : ""}
        ${application.isEditable ? "" : "disabled"}>
    </div>
    <p class="hint">${game.i18n.localize("BREAK.STATUS.ShowAsStatusHint")}</p>
  `;
  details.append(field);
}

let pendingRebuild = null;

function scheduleStatusEffectRebuild() {
  if (pendingRebuild) return pendingRebuild;
  pendingRebuild = Promise.resolve()
    .then(rebuildStatusEffects)
    .finally(() => pendingRebuild = null);
  return pendingRebuild;
}
