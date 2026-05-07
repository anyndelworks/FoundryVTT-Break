const AREA_FLAG_SCOPE = "break";
const AREA_FLAG_KEY = "area";
const AREA_CONDITION_EFFECT_FLAG = "areaCondition";
const CONDITION_ICON_SIZE = 40;
const CONDITION_ICON_GAP = 8;
const CONDITION_ICON_PADDING = 4;
const CONDITION_ICON_EDGE_OFFSET = 10;
let conditionIconLayer = null;

const DEFAULT_AREA = {
  enabled: false,
  movementCost: 1,
  neighbors: {},
  conditions: []
};

//#region Area data
function normalizeNeighbors(neighbors) {
  if (Array.isArray(neighbors)) {
    return Object.fromEntries(neighbors.map(id => [id, true]));
  }
  return neighbors && typeof neighbors === "object" ? neighbors : {};
}

function normalizeConditions(conditions) {
  if (!Array.isArray(conditions) && conditions && typeof conditions === "object") {
    conditions = Object.values(conditions);
  }
  if (!Array.isArray(conditions)) return [];
  return conditions
    .map(condition => typeof condition === "string" ? { uuid: condition, enabled: true } : condition)
    .filter(condition => condition?.uuid)
    .map(condition => ({ uuid: condition.uuid, enabled: coerceBoolean(condition.enabled ?? true) }))
    .filter((condition, index, all) => all.findIndex(other => other.uuid === condition.uuid) === index);
}

function coerceBoolean(value) {
  if (Array.isArray(value)) return value.includes(true) || value.includes("true");
  return value === true || value === "true";
}

function getSceneRegions(scene) {
  return Array.from(scene?.regions ?? []);
}

function getAreaData(region) {
  const raw = region?.getFlag?.(AREA_FLAG_SCOPE, AREA_FLAG_KEY) ?? {};
  return {
    ...DEFAULT_AREA,
    ...raw,
    enabled: coerceBoolean(raw.enabled),
    movementCost: Number(raw.movementCost ?? DEFAULT_AREA.movementCost),
    neighbors: normalizeNeighbors(raw.neighbors),
    conditions: normalizeConditions(raw.conditions)
  };
}

function getAreaRegions(scene) {
  return getSceneRegions(scene).filter(region => getAreaData(region).enabled);
}

function getAreaLabel(region) {
  return region.name;
}

function getRegionObject(region) {
  return region.object ?? canvas?.regions?.placeables?.find?.(r => r.document.id === region.id);
}

function testRegionPoint(region, point) {
  const object = getRegionObject(region);
  if (!object) return false;

  if (region.testPoint) {
    const result = region.testPoint(point);
    if (typeof result === "boolean") return result;
  }

  if (object.containsPoint) return object.containsPoint(point);
  if (object.mesh?.containsPoint) return object.mesh.containsPoint(point);
  if (object._mesh?.containsPoint) return object._mesh.containsPoint(point);
  return object.bounds?.contains?.(point.x, point.y) ?? false;
}

function getAreasAtPoint(scene, point) {
  const matchingRegions = [];
  const regions = getAreaRegions(scene);
  for (const region of regions) {
    if (testRegionPoint(region, point)) matchingRegions.push(region);
  }
  return matchingRegions;
}

function getTokenAreas(token) {
  const point = token.center ?? {
    x: token.document.x + (token.document.width * canvas.dimensions.size / 2),
    y: token.document.y + (token.document.height * canvas.dimensions.size / 2)
  };
  return getAreasAtPoint(token.scene ?? canvas.scene, point);
}
//#endregion

//#region Condition effects
async function resolveConditionEntry(entry) {
  const item = await fromUuid(entry.uuid);
  if (!item || item.type !== "area-condition") return null;
  return {
    uuid: entry.uuid,
    name: item.name,
    img: item.img,
    enabled: entry.enabled
  };
}

async function getRegionConditions(region) {
  const area = getAreaData(region);
  const conditions = await Promise.all(
    area.conditions
      .filter(condition => condition.enabled)
      .map(async condition => ({entry: condition, item: await fromUuid(condition.uuid)}))
  );
  return conditions.filter(condition => condition.item?.type === "area-condition");
}

function getAreaConditionEffectKey(region, item, token) {
  return `${region.uuid}|${item.uuid}|${token.document.uuid}`;
}

function getAreaConditionEffects(actor) {
  return actor?.effects?.filter(effect => effect.getFlag("break", AREA_CONDITION_EFFECT_FLAG)) ?? [];
}

function createEffectData(effect, region, item, token) {
  const data = effect.toObject();
  delete data._id;
  data.disabled = false;
  data.origin = item.uuid;
  data.flags = foundry.utils.mergeObject(data.flags ?? {}, {
    break: {
      [AREA_CONDITION_EFFECT_FLAG]: {
        key: getAreaConditionEffectKey(region, item, token),
        regionUuid: region.uuid,
        conditionUuid: item.uuid,
        tokenUuid: token.document.uuid
      }
    }
  });
  return data;
}

async function syncTokenAreaConditions(token) {
  if (!token?.actor) return;
  const regions = getTokenAreas(token);
  const activeKeys = new Set();
  const effectsToCreate = [];

  for (const region of regions) {
    const conditions = await getRegionConditions(region);
    for (const {item} of conditions) {
      if (!item.system.applyEffectsWhileInside) continue;
      const key = getAreaConditionEffectKey(region, item, token);
      activeKeys.add(key);
      if (getAreaConditionEffects(token.actor).some(effect => effect.getFlag("break", AREA_CONDITION_EFFECT_FLAG)?.key === key)) continue;
      effectsToCreate.push(...item.effects.map(effect => createEffectData(effect, region, item, token)));
    }
  }

  const staleEffects = getAreaConditionEffects(token.actor)
    .filter(effect => effect.getFlag("break", AREA_CONDITION_EFFECT_FLAG)?.tokenUuid === token.document.uuid)
    .filter(effect => !activeKeys.has(effect.getFlag("break", AREA_CONDITION_EFFECT_FLAG)?.key));

  if (staleEffects.length) await token.actor.deleteEmbeddedDocuments("ActiveEffect", staleEffects.map(effect => effect.id));
  if (effectsToCreate.length) await ActiveEffect.implementation.createDocuments(effectsToCreate, {parent: token.actor});
}

async function syncSceneAreaConditions() {
  const tokens = canvas?.tokens?.placeables ?? [];
  for (const token of tokens) {
    await syncTokenAreaConditions(token);
  }
}
//#endregion

//#region Condition icons
function getConditionIconRowWidth(conditionCount) {
  const iconBoxSize = CONDITION_ICON_SIZE + (CONDITION_ICON_PADDING * 2);
  return (conditionCount * iconBoxSize) + (Math.max(conditionCount - 1, 0) * CONDITION_ICON_GAP);
}

function getRegionIconAnchor(region, conditionCount = 1) {
  const object = getRegionObject(region);
  const bounds = object?.bounds;
  if (!bounds) return null;
  const iconBoxSize = CONDITION_ICON_SIZE + (CONDITION_ICON_PADDING * 2);
  const halfIconRow = getConditionIconRowWidth(conditionCount) / 2;
  const halfIconHeight = iconBoxSize / 2;
  const edgeOffset = halfIconHeight + CONDITION_ICON_EDGE_OFFSET;
  const centerX = bounds.x + (bounds.width / 2);
  const centerY = bounds.y + (bounds.height / 2);
  const minX = Math.min(bounds.x + halfIconRow, centerX);
  const maxX = Math.max(bounds.x + bounds.width - halfIconRow, centerX);
  const minY = Math.min(bounds.y + edgeOffset, centerY);
  const maxY = Math.max(bounds.y + bounds.height - edgeOffset, centerY);
  const columns = 15;
  const rows = 15;
  let best = null;
  let bestScore = -Infinity;

  for (let row = 0; row < rows; row++) {
    const y = rows === 1 ? minY : minY + (((maxY - minY) * row) / (rows - 1));
    for (let column = 0; column < columns; column++) {
      const x = columns === 1 ? centerX : minX + (((maxX - minX) * column) / (columns - 1));
      const candidate = {x, y};
      if (!canPlaceIconRow(region, candidate, halfIconRow, halfIconHeight)) continue;
      const clearance = getPointClearance(region, candidate, Math.max(halfIconRow, halfIconHeight) + 96);
      const distanceFromCenter = Math.hypot(x - centerX, y - centerY);
      const score = (clearance * 4) - (distanceFromCenter * 0.35) - (Math.abs(y - centerY) * 0.1);
      if (score <= bestScore) continue;
      best = candidate;
      bestScore = score;
    }
  }

  if (best) return best;
  const preferred = {x: centerX, y: centerY};
  if (testRegionPoint(region, preferred)) return preferred;
  const center = object.center ?? {x: centerX, y: bounds.y + (bounds.height / 2)};
  if (testRegionPoint(region, center)) return center;
  return {
    x: centerX,
    y: bounds.y + (bounds.height / 2)
  };
}

function canPlaceIconRow(region, point, halfIconRow, halfIconHeight) {
  if (!testRegionPoint(region, point)) return false;
  const insetX = Math.max(8, halfIconRow * 0.86);
  const insetY = Math.max(8, halfIconHeight * 0.72);
  return [
    {x: point.x - insetX, y: point.y},
    {x: point.x + insetX, y: point.y},
    {x: point.x, y: point.y - insetY},
    {x: point.x, y: point.y + insetY}
  ].filter(testPoint => testRegionPoint(region, testPoint)).length >= 3;
}

function getPointClearance(region, point, maxDistance) {
  const step = Math.max(8, canvas?.dimensions?.size ? canvas.dimensions.size / 8 : 16);
  const directions = 16;
  let clearance = maxDistance;

  for (let i = 0; i < directions; i++) {
    const angle = (Math.PI * 2 * i) / directions;
    let distance = step;
    while (distance <= maxDistance) {
      const testPoint = {
        x: point.x + (Math.cos(angle) * distance),
        y: point.y + (Math.sin(angle) * distance)
      };
      if (!testRegionPoint(region, testPoint)) break;
      distance += step;
    }
    clearance = Math.min(clearance, distance);
  }

  return clearance;
}

async function drawConditionIcons() {
  if (!canvas?.ready || !canvas.interface) return;
  conditionIconLayer?.destroy({children: true});
  conditionIconLayer = new PIXI.Container();
  conditionIconLayer.name = "breakAreaConditionIcons";
  conditionIconLayer.zIndex = 100000;
  canvas.interface.addChild(conditionIconLayer);

  for (const region of getAreaRegions(canvas.scene)) {
    const conditions = await getRegionConditions(region);
    if (!conditions.length) continue;
    const anchor = getRegionIconAnchor(region, conditions.length);
    if (!anchor) continue;
    const iconBoxSize = CONDITION_ICON_SIZE + (CONDITION_ICON_PADDING * 2);
    const totalWidth = getConditionIconRowWidth(conditions.length);
    let x = anchor.x - (totalWidth / 2) + (iconBoxSize / 2);

    for (const {item} of conditions) {
      const background = new PIXI.Graphics();
      background.beginFill(0x111111, 0.72);
      background.lineStyle(2, 0xffffff, 0.88);
      background.drawRoundedRect(
        x - (CONDITION_ICON_SIZE / 2) - CONDITION_ICON_PADDING,
        anchor.y - (CONDITION_ICON_SIZE / 2) - CONDITION_ICON_PADDING,
        CONDITION_ICON_SIZE + (CONDITION_ICON_PADDING * 2),
        CONDITION_ICON_SIZE + (CONDITION_ICON_PADDING * 2),
        8
      );
      background.endFill();
      conditionIconLayer.addChild(background);

      const sprite = PIXI.Sprite.from(item.img || "icons/svg/aura.svg");
      sprite.anchor.set(0.5);
      sprite.width = CONDITION_ICON_SIZE;
      sprite.height = CONDITION_ICON_SIZE;
      sprite.position.set(x, anchor.y);
      sprite.eventMode = "static";
      sprite.cursor = "help";
      sprite.tooltip = item.name;
      conditionIconLayer.addChild(sprite);
      x += iconBoxSize + CONDITION_ICON_GAP;
    }
  }
}
//#endregion

//#region Region config
async function getAreaConfigContext(region, conditionsOverride = null) {
  const area = getAreaData(region);
  if (conditionsOverride) area.conditions = normalizeConditions(conditionsOverride);
  const neighbors = getSceneRegions(region.parent)
    .filter(other => other.id !== region.id)
    .map(other => ({
      id: other.id,
      name: getAreaLabel(other),
      checked: coerceBoolean(area.neighbors[other.id])
    }));
  const conditions = (await Promise.all(area.conditions.map(resolveConditionEntry))).filter(Boolean);

  return {area, neighbors, conditions};
}

function getFormAreaConditions(element, region) {
  const conditionRows = Array.from(element.querySelectorAll(".break-area-condition[data-uuid]"));
  if (!conditionRows.length && !element.querySelector(".break-area-config")) return getAreaData(region).conditions;

  return conditionRows.map(row => ({
    uuid: row.dataset.uuid,
    enabled: row.querySelector("input[type='checkbox']")?.checked ?? true
  }));
}

function addAreaCondition(element, region, item) {
  if (!item || item.type !== "area-condition") return false;
  const conditions = getFormAreaConditions(element, region);
  if (conditions.some(condition => condition.uuid === item.uuid)) return false;
  return [...conditions, {uuid: item.uuid, enabled: true}];
}

function removeAreaCondition(element, region, uuid) {
  return getFormAreaConditions(element, region).filter(condition => condition.uuid !== uuid);
}

async function updateAreaConditions(application, region, conditions) {
  conditions = normalizeConditions(conditions);
  application._breakAreaConditionsOverride = conditions;
  await region.setFlag(AREA_FLAG_SCOPE, `${AREA_FLAG_KEY}.conditions`, conditions);
  application._breakAreaConditionsOverride = null;
  await application.render({parts: ["breakArea"]});
}

function isAreaConditionDrop(event) {
  return Boolean(event.target?.closest?.("[data-break-area-condition-drop]"));
}

async function getDraggedItem(event) {
  const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event.originalEvent ?? event);
  if (data.type !== "Item") return null;

  const uuid = data.uuid ?? data.documentUuid;
  if (uuid) return fromUuid(uuid);
  if (data.pack && data.id) return fromUuid(`Compendium.${data.pack}.Item.${data.id}`);
  if (data.id) return game.items?.get(data.id) ?? null;
  return null;
}

async function onAreaConditionDrop(event, application, element, region) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  const item = await getDraggedItem(event);
  const conditions = addAreaCondition(element, region, item);
  if (!conditions) return;
  await updateAreaConditions(application, region, conditions);
}

function bindConditionControls(application, element, region) {
  element.addEventListener("dragover", event => {
    if (!isAreaConditionDrop(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, {capture: true});
  element.addEventListener("drop", event => {
    if (!isAreaConditionDrop(event)) return;
    return onAreaConditionDrop(event, application, element, region);
  }, {capture: true});

  element.querySelectorAll("[data-break-area-remove-condition]").forEach(button => {
    button.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      const conditions = removeAreaCondition(element, region, event.currentTarget.dataset.uuid);
      await updateAreaConditions(application, region, conditions);
    });
  });
}

function patchRegionConfig() {
  const RegionConfig = foundry.applications.sheets.RegionConfig;
  if (!RegionConfig || RegionConfig.prototype._breakAreaPatched) return;

  const parts = {...RegionConfig.PARTS};
  const footer = parts.footer;
  delete parts.footer;
  RegionConfig.PARTS = {
    ...parts,
    breakArea: {
      template: "systems/break/templates/system/area-movement-config.hbs",
      scrollable: [""]
    },
    footer
  };

  RegionConfig.TABS = {
    ...RegionConfig.TABS,
    sheet: {
      ...RegionConfig.TABS.sheet,
      tabs: [
        ...RegionConfig.TABS.sheet.tabs,
        {id: "breakArea", icon: "fas fa-route", label: "BREAK.AREA.Tab"}
      ]
    }
  };

  const preparePartContext = RegionConfig.prototype._preparePartContext;
  RegionConfig.prototype._preparePartContext = async function(partId, context, ...args) {
    context = await preparePartContext.call(this, partId, context, ...args);
    if (partId !== "breakArea") return context;

    return {
      ...context,
      ...await getAreaConfigContext(this.document, this._breakAreaConditionsOverride)
    };
  };

  const attachPartListeners = RegionConfig.prototype._attachPartListeners;
  RegionConfig.prototype._attachPartListeners = function(partId, htmlElement, ...args) {
    attachPartListeners.call(this, partId, htmlElement, ...args);
    if (partId !== "breakArea") return;
    bindConditionControls(this, htmlElement, this.document);
  };

  const onDrop = RegionConfig.prototype._onDrop;
  RegionConfig.prototype._onDrop = async function(event, ...args) {
    if (!isAreaConditionDrop(event)) return onDrop?.call(this, event, ...args);
    return onAreaConditionDrop(event, this, this.element, this.document);
  };

  RegionConfig.prototype._breakAreaPatched = true;
}
//#endregion

//#region Hooks
export function registerAreaMovement() {
  patchRegionConfig();
  Hooks.on("canvasReady", async () => {
    await drawConditionIcons();
    await syncSceneAreaConditions();
  });
  Hooks.on("createRegion", drawConditionIcons);
  Hooks.on("updateRegion", async () => {
    await drawConditionIcons();
    await syncSceneAreaConditions();
  });
  Hooks.on("deleteRegion", async () => {
    await drawConditionIcons();
    await syncSceneAreaConditions();
  });
  Hooks.on("updateToken", async document => {
    if (!canvas?.ready) return;
    const token = document.object;
    if (token) await syncTokenAreaConditions(token);
  });
  Hooks.on("updateItem", async item => {
    if (item.type !== "area-condition" || !canvas?.ready) return;
    await drawConditionIcons();
    await syncSceneAreaConditions();
  });
  Hooks.on("deleteItem", async item => {
    if (item.type !== "area-condition" || !canvas?.ready) return;
    await drawConditionIcons();
    await syncSceneAreaConditions();
  });
}
//#endregion
