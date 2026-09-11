/** One choice corresponds to one bullet in a history, regardless of its contents. */
export const HISTORY_ITEM_TYPES = ["weapon", "armor", "shield", "accessory", "ammo", "item", "outfit", "additive", "material"];

export function normalizeHistoryOptions(options = []) {
  return options.map((option, index) => {
    if (Array.isArray(option.entries)) return { ...structuredClone(option), id: option.id || `legacy-${index}` };
    return {
      id: option.id || `legacy-${index}`,
      name: option.name || "",
      entries: option.uuid ? [{ type: "item", uuid: option.uuid, quantity: null, name: "" }] : []
    };
  });
}

export class HistoryOptionError extends Error {
  constructor(code, detail = "") {
    super(code);
    this.code = code;
    this.detail = detail;
  }
}

function integer(value, minimum, code) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new HistoryOptionError(code);
  return value;
}

/** Resolve and validate everything before making any changes to the character. */
export async function planHistoryOptions(history, selectedIds, resolve) {
  const picks = integer(history.system.gearPicks ?? 0, 0, "InvalidPicks");
  const options = normalizeHistoryOptions(history.system.startingGear);
  if (selectedIds.length !== picks || new Set(selectedIds).size !== picks) throw new HistoryOptionError("SelectionCount");
  if (new Set(options.map(o => o.id)).size !== options.length) throw new HistoryOptionError("InvalidOptions");
  const plan = { items: [], companions: [], currency: { coins: 0, gems: 0, stones: 0 } };
  for (const id of selectedIds) {
    const option = options.find(o => o.id === id);
    if (!option?.entries?.length) throw new HistoryOptionError("EmptyOption", option?.name || id);
    for (const entry of option.entries) {
      if (entry.type === "currency") {
        let total = 0;
        for (const key of Object.keys(plan.currency)) {
          const amount = integer(entry[key] ?? 0, 0, "InvalidQuantity");
          plan.currency[key] = integer(plan.currency[key] + amount, 0, "InvalidQuantity");
          total += amount;
        }
        if (!total) throw new HistoryOptionError("InvalidQuantity");
        continue;
      }
      const source = entry.uuid ? await resolve(entry.uuid) : null;
      if (!source) throw new HistoryOptionError("MissingDocument", entry.uuid || option.name);
      const data = source.toObject();
      delete data._id;
      delete data.folder;
      delete data.ownership;
      delete data._stats;
      if (entry.name?.trim()) data.name = entry.name.trim();
      if (entry.type === "item" && source.documentName === "Item" && HISTORY_ITEM_TYPES.includes(source.type)) {
        // Legacy links used the quantity already present on the source item.
        data.system.quantity = integer(entry.quantity ?? source.system.quantity ?? 1, 1, "InvalidQuantity");
        if (Object.hasOwn(data.system, "containerId")) data.system.containerId = null;
        if (Object.hasOwn(data.system, "equipped")) data.system.equipped = false;
        plan.items.push(data);
      } else if (entry.type === "companion" && source.documentName === "Actor" && source.type === "companion") {
        const quantity = integer(entry.quantity ?? 1, 1, "InvalidQuantity");
        for (let i = 0; i < quantity; i++) plan.companions.push(structuredClone(data));
      } else throw new HistoryOptionError("InvalidDocument", source.name);
    }
  }
  return plan;
}

const applying = new Set();

/** The completion marker and currency are committed together on the actor. */
export async function grantHistoryOptions(actor, history, ids, { resolve, createCompanion, canCreateCompanion }) {
  const key = actor.uuid;
  if (applying.has(key)) throw new HistoryOptionError("InProgress");
  if (actor.flags?.break?.historyGrants?.[history.id]) throw new HistoryOptionError("AlreadyApplied");
  applying.add(key);
  const items = [], companions = [];
  try {
    const plan = await planHistoryOptions(history, ids, resolve);
    if (plan.companions.length && !canCreateCompanion()) throw new HistoryOptionError("CompanionPermission");
    for (const data of plan.companions) {
      data.system.owner = actor.uuid;
      data.system.loyalty = { ...data.system.loyalty, recruited: true };
      data.ownership = { ...actor.ownership };
      data.prototypeToken = { ...data.prototypeToken, actorLink: true };
      const companion = await createCompanion(data);
      if (!companion) throw new HistoryOptionError("Failed");
      companions.push(companion);
    }
    if (plan.items.length) items.push(...await actor.createEmbeddedDocuments("Item", plan.items));
    if (items.length !== plan.items.length) throw new HistoryOptionError("Failed");
    const update = {};
    for (const [currency, amount] of Object.entries(plan.currency)) {
      if (amount) update[`system.currency.${currency}`] = integer(Number(actor.system.currency[currency] ?? 0) + amount, 0, "InvalidQuantity");
    }
    update[`flags.break.historyGrants.${history.id}`] = {
      options: [...ids], items: items.map(i => i.id), companions: companions.map(c => c.uuid)
    };
    if (!await actor.update(update)) throw new HistoryOptionError("Failed");
    return { items, companions, currency: plan.currency };
  } catch (error) {
    const cleanup = await Promise.allSettled([
      ...(items.length ? [actor.deleteEmbeddedDocuments("Item", items.map(i => i.id))] : []),
      ...companions.map(c => c.delete())
    ]);
    if (cleanup.some(result => result.status === "rejected")) throw new HistoryOptionError("CleanupFailed");
    throw error;
  } finally {
    applying.delete(key);
  }
}
