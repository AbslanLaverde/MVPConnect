'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildConfig,
  cleanup,
  exactEmailPattern,
  parseArgs,
  validateTargets,
} = require('./cleanup-local-e2e');

const RUN_ID = '1788500000000-abc123';
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MEDIA_ID = '22222222-2222-4222-8222-222222222222';

test('cleanup is plan-only unless --execute is present', () => {
  const planned = buildConfig(parseArgs([
    '--environment', 'local', '--e2e-run-id', RUN_ID,
  ]), {});
  const executable = buildConfig(parseArgs([
    '--environment', 'test', '--e2e-run-id', RUN_ID, '--execute',
  ]), {});

  assert.equal(planned.execute, false);
  assert.equal(executable.execute, true);
});

test('cleanup refuses remote services, unsafe buckets, and invalid run IDs', () => {
  assert.throws(() => buildConfig({
    environment: 'local', e2eRunId: RUN_ID, neo4jHttpUrl: 'http://neo4j:7474',
  }, {}), /loopback/);
  assert.throws(() => buildConfig({
    environment: 'local', e2eRunId: RUN_ID, minioEndpoint: 'https://storage.example.com',
  }, {}), /loopback/);
  assert.throws(() => buildConfig({
    environment: 'local', e2eRunId: RUN_ID, minioBucket: 'production-media',
  }, {}), /bucket/);
  assert.throws(() => buildConfig({ environment: 'local', e2eRunId: 'latest' }, {}), /run ID/i);
});

test('target validation requires exact email, UUIDs, and owner-scoped object keys', () => {
  const validRow = [
    OWNER_ID,
    `e2e-artist-${RUN_ID}@example.local`,
    ['Musician'],
    [{ id: MEDIA_ID, objectKey: `users/${OWNER_ID}/${MEDIA_ID}.jpg` }],
  ];
  assert.deepEqual(validateTargets([validRow], RUN_ID), {
    ownerIds: [OWNER_ID],
    emails: [`e2e-artist-${RUN_ID}@example.local`],
    objectKeys: [`users/${OWNER_ID}/${MEDIA_ID}.jpg`],
  });
  assert.throws(() => validateTargets([
    [OWNER_ID, `e2e-artist-other@example.local`, ['Musician'], []],
  ], RUN_ID), /exact E2E run/);
  assert.throws(() => validateTargets([
    [OWNER_ID, `e2e-artist-${RUN_ID}@example.local`, ['Musician'], [
      { id: MEDIA_ID, objectKey: `users/another-owner/${MEDIA_ID}.jpg` },
    ]],
  ], RUN_ID), /owner-scoped/);
});

test('dry run queries targets and controls without deleting anything', async () => {
  const calls = [];
  const config = buildConfig(parseArgs([
    '--environment', 'local', '--e2e-run-id', RUN_ID,
  ]), {});
  const result = await cleanup(config, {
    neo4jStatement: async (_config, statement) => {
      calls.push(statement);
      return calls.length === 1
        ? [[OWNER_ID, `e2e-venue-${RUN_ID}@example.local`, ['Venue'], []]]
        : [[7]];
    },
    removeMinioObject: async () => assert.fail('dry run must not delete storage'),
  });

  assert.equal(result.mode, 'plan-only');
  assert.equal(result.matchedAccounts, 1);
  assert.equal(calls.length, 2);
});

test('execute removes every media object before graph deletion', async () => {
  const events = [];
  let queryCount = 0;
  const config = buildConfig(parseArgs([
    '--environment', 'local', '--e2e-run-id', RUN_ID, '--execute',
  ]), {});
  const result = await cleanup(config, {
    neo4jStatement: async (_config, statement) => {
      queryCount += 1;
      if (queryCount === 1) {
        return [[OWNER_ID, `e2e-promoter-${RUN_ID}@example.local`, ['Promoter'], [
          { id: MEDIA_ID, objectKey: `users/${OWNER_ID}/${MEDIA_ID}.png` },
        ]]];
      }
      if (queryCount === 2) return [[11]];
      if (statement.includes('DETACH DELETE')) events.push('graph-delete');
      return queryCount === 5 ? [[11]] : [[0]];
    },
    removeMinioObject: async () => {
      events.push('media-delete');
      return true;
    },
  });

  assert.deepEqual(events, ['media-delete', 'graph-delete']);
  assert.equal(result.controlAccountsUnchanged, true);
  assert.match(exactEmailPattern(RUN_ID), /artist\|venue\|promoter\|resume/);
});
