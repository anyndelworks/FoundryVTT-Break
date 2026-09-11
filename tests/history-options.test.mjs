import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHistoryOptions, planHistoryOptions, grantHistoryOptions } from '../utils/history-options.mjs';

function source(uuid, type, system = {}) {
  const data = { _id: uuid, name: uuid, type, system: { quantity: 1, ...system }, ownership: { default: 0 } };
  return { uuid, name: uuid, type, documentName: type === 'companion' ? 'Actor' : 'Item', system: data.system, toObject: () => structuredClone(data) };
}
const documents = new Map([
  ['bow', source('bow', 'weapon', { equipped: true, containerId: 'old', container: { capacity: 3 } })],
  ['arrows', source('arrows', 'ammo', { quantity: 5 })],
  ['pet', source('pet', 'companion', { category: 'pet', loyalty: { autoPass: true } })]
]);
const resolve = async uuid => documents.get(uuid);
const item = (uuid, quantity = 1) => ({ type: 'item', uuid, quantity });
const money = { type: 'currency', coins: 20, gems: 1, stones: 0 };
const pet = { type: 'companion', uuid: 'pet', quantity: 1 };
const option = (id, ...entries) => ({ id, name: id, entries });
const history = (startingGear, gearPicks = 2) => ({ id: 'history', system: { startingGear, gearPicks } });
let sequence = 0;
function fixture() {
  const inventory = [], companions = [];
  const actor = {
    uuid: `Actor.test${sequence++}`, ownership: { default: 0, player: 3 }, flags: {}, system: { currency: { coins: 7, gems: 2, stones: 3 } },
    async createEmbeddedDocuments(type, data) {
      const created = data.map((d, i) => ({ ...d, id: `item${i}` }));
      inventory.push(...created);
      return created;
    },
    async deleteEmbeddedDocuments(type, ids) {
      for (const id of ids) inventory.splice(inventory.findIndex(i => i.id === id), 1);
    },
    async update(changes) {
      for (const [key, value] of Object.entries(changes)) {
        const parts = key.split('.');
        const last = parts.pop();
        parts.reduce((a, k) => a[k] ??= {}, this)[last] = value;
      }
      return this;
    }
  };
  const dependencies = { resolve, canCreateCompanion: () => true, createCompanion: async data => {
    const c = { ...data, uuid: `Actor.pet${companions.length}`, async delete() { companions.splice(companions.indexOf(c), 1); } };
    companions.push(c);
    return c;
  } };
  return { actor, inventory, companions, dependencies };
}
const rejectsCode = (promise, code) => assert.rejects(promise, e => e.code === code);

test('legacy links migrate without changing quantities or source data', async () => {
  const legacy = [{ uuid: 'arrows' }];
  const normalized = normalizeHistoryOptions(legacy);
  assert.deepEqual(normalizeHistoryOptions(normalized), normalized);
  assert.deepEqual(legacy, [{ uuid: 'arrows' }]);
  const plan = await planHistoryOptions(history(legacy, 1), ['legacy-0'], resolve);
  assert.equal(plan.items[0].system.quantity, 5);
});

test('two choices grant a bow, ten arrows, money and a pet exactly once', async () => {
  const f = fixture();
  const h = history([option('equipment', item('bow'), item('arrows', 10)), option('friend', pet, money)]);
  await grantHistoryOptions(f.actor, h, ['equipment', 'friend'], f.dependencies);
  assert.deepEqual(f.inventory.map(i => [i.type, i.system.quantity]), [['weapon', 1], ['ammo', 10]]);
  assert.equal(f.inventory[0].system.containerId, null);
  assert.deepEqual(f.inventory[0].system.container, { capacity: 3 });
  assert.equal(f.inventory[0].system.equipped, false);
  assert.equal(documents.get('bow').system.equipped, true);
  assert.deepEqual(f.actor.system.currency, { coins: 27, gems: 3, stones: 3 });
  assert.equal(f.companions[0].system.owner, f.actor.uuid);
  assert.deepEqual(f.companions[0].ownership, f.actor.ownership);
  assert.deepEqual(f.companions[0].system.loyalty, { recruited: true, autoPass: true });
  assert.equal(f.companions[0].prototypeToken.actorLink, true);
  await rejectsCode(grantHistoryOptions(f.actor, h, ['equipment', 'friend'], f.dependencies), 'AlreadyApplied');
  assert.equal(f.inventory.length, 2);
});

test('configurable choice count and duplicate selections', async () => {
  const h = history([option('a', money), option('b', item('bow')), option('c', pet)], 3);
  await planHistoryOptions(h, ['a', 'b', 'c'], resolve);
  await rejectsCode(planHistoryOptions(h, ['a', 'b'], resolve), 'SelectionCount');
  await rejectsCode(planHistoryOptions(h, ['a', 'a', 'b'], resolve), 'SelectionCount');
  assert.deepEqual((await planHistoryOptions(history([], 0), [], resolve)).items, []);
});

test('bad or missing rewards abort before any changes', async () => {
  for (const [entry, code] of [
    [item('missing'), 'MissingDocument'], [item('pet'), 'InvalidDocument'],
    [item('bow', 0), 'InvalidQuantity'], [item('bow', 1.5), 'InvalidQuantity'],
    [{ type: 'currency', coins: -1 }, 'InvalidQuantity'], [{ type: 'currency' }, 'InvalidQuantity']
  ]) {
    const f = fixture();
    await rejectsCode(grantHistoryOptions(f.actor, history([option('a', item('bow')), option('b', entry)]), ['a', 'b'], f.dependencies), code);
    assert.equal(f.inventory.length + f.companions.length, 0);
    assert.equal(f.actor.system.currency.coins, 7);
  }
});

test('companion permission is checked before granting anything', async () => {
  const f = fixture();
  f.dependencies.canCreateCompanion = () => false;
  await rejectsCode(grantHistoryOptions(f.actor, history([option('a', item('bow'), money, pet)], 1), ['a'], f.dependencies), 'CompanionPermission');
  assert.equal(f.inventory.length + f.companions.length, 0);
  assert.equal(f.actor.system.currency.coins, 7);
});

test('failed update rolls back created rewards and permits retry', async () => {
  const f = fixture(), update = f.actor.update;
  const h = history([option('a', item('bow'), pet, money)], 1);
  f.actor.update = async () => { throw new Error('write failed'); };
  await assert.rejects(grantHistoryOptions(f.actor, h, ['a'], f.dependencies), /write failed/);
  assert.equal(f.inventory.length + f.companions.length, 0);
  assert.equal(f.actor.system.currency.coins, 7);
  f.actor.update = update;
  await grantHistoryOptions(f.actor, h, ['a'], f.dependencies);
  assert.equal(f.inventory.length, 1);
  assert.equal(f.companions.length, 1);
});

test('partial items and cancelled companion creation cannot complete a grant', async () => {
  const f = fixture(), create = f.actor.createEmbeddedDocuments;
  f.actor.createEmbeddedDocuments = function(type, data) { return create.call(this, type, data.slice(0, 1)); };
  await rejectsCode(grantHistoryOptions(f.actor, history([option('a', item('bow'), item('arrows'), pet)], 1), ['a'], f.dependencies), 'Failed');
  assert.equal(f.inventory.length + f.companions.length, 0);
  f.dependencies.createCompanion = async () => null;
  await rejectsCode(grantHistoryOptions(f.actor, history([option('a', pet)], 1), ['a'], f.dependencies), 'Failed');
});

test('concurrent confirmation cannot duplicate a grant', async () => {
  const f = fixture(), h = history([option('a', money)], 1);
  const first = grantHistoryOptions(f.actor, h, ['a'], f.dependencies);
  await rejectsCode(grantHistoryOptions(f.actor, h, ['a'], f.dependencies), 'InProgress');
  await first;
  assert.equal(f.actor.system.currency.coins, 27);
});

test('failed cleanup is reported explicitly', async () => {
  const f = fixture();
  f.actor.update = async () => { throw new Error('write failed'); };
  f.actor.deleteEmbeddedDocuments = async () => { throw new Error('delete failed'); };
  await rejectsCode(grantHistoryOptions(f.actor, history([option('a', item('bow'))], 1), ['a'], f.dependencies), 'CleanupFailed');
});
