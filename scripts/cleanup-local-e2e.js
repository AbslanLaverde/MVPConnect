#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const RUN_ID_PATTERN = /^[0-9]{10,}-[0-9a-f]{6}$/;
const ALL_E2E_EMAIL_PATTERN = '^e2e-(artist|venue|promoter|resume)-[0-9]{10,}-[0-9a-f]{6}@example\\.local$';
const ALLOWED_BUCKET_PATTERN = /^mvpconnect-test-[a-z0-9-]+$/;
const TARGET_QUERY = `
MATCH (owner)
WHERE any(label IN labels(owner) WHERE label IN ['Musician', 'Venue', 'Promoter'])
  AND owner.email =~ $emailPattern
OPTIONAL MATCH (media:MediaAsset)
WHERE media.ownerId = owner.id
RETURN owner.id,
       owner.email,
       labels(owner),
       collect(DISTINCT {id: media.id, objectKey: media.objectKey})
ORDER BY owner.email`;
const CONTROL_COUNT_QUERY = `
MATCH (owner)
WHERE any(label IN labels(owner) WHERE label IN ['Musician', 'Venue', 'Promoter'])
  AND NOT coalesce(owner.email, '') =~ $allE2ePattern
RETURN count(owner)`;
const DELETE_QUERY = `
MATCH (owner)
WHERE owner.id IN $ownerIds
  AND any(label IN labels(owner) WHERE label IN ['Musician', 'Venue', 'Promoter'])
  AND owner.email =~ $emailPattern
OPTIONAL MATCH (owner)-[:HAS_ONBOARDING_DRAFT]->(draft:OnboardingDraft)
OPTIONAL MATCH (draft)-[:HAS_STEP]->(step:OnboardingStep)
OPTIONAL MATCH (media:MediaAsset)
WHERE media.ownerId = owner.id
WITH collect(DISTINCT owner)
     + collect(DISTINCT draft)
     + collect(DISTINCT step)
     + collect(DISTINCT media) AS nodes
UNWIND nodes AS node
WITH DISTINCT node
WHERE node IS NOT NULL
DETACH DELETE node`;

function fail(message) {
  throw new Error(message);
}

function parseArgs(argv) {
  const options = { execute: false };
  const valueFlags = new Map([
    ['--environment', 'environment'],
    ['--e2e-run-id', 'e2eRunId'],
    ['--neo4j-http-url', 'neo4jHttpUrl'],
    ['--neo4j-database', 'neo4jDatabase'],
    ['--neo4j-username', 'neo4jUsername'],
    ['--neo4j-password', 'neo4jPassword'],
    ['--minio-endpoint', 'minioEndpoint'],
    ['--minio-bucket', 'minioBucket'],
    ['--minio-access-key', 'minioAccessKey'],
    ['--minio-secret-key', 'minioSecretKey'],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--execute') {
      options.execute = true;
      continue;
    }
    const key = valueFlags.get(argument);
    if (!key) fail(`Unknown argument: ${argument}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) fail(`${argument} requires a value.`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function assertLoopbackHttpUrl(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${name} must be an absolute loopback HTTP(S) URL. Refusing unsafe cleanup target.`);
  }
  const hostname = url.hostname.toLowerCase();
  const loopback = hostname === 'localhost'
    || hostname === '::1'
    || hostname === '[::1]'
    || /^127(?:\.[0-9]{1,3}){3}$/.test(hostname);
  if (!loopback || !['http:', 'https:'].includes(url.protocol)
      || url.username || url.password || url.search || url.hash) {
    fail(`${name} must be an absolute loopback HTTP(S) URL. Refusing unsafe cleanup target.`);
  }
  return url;
}

function buildConfig(options, environment = process.env) {
  if (!['local', 'test'].includes(options.environment)) {
    fail('Environment must be explicitly set to local or test.');
  }
  if (!RUN_ID_PATTERN.test(options.e2eRunId || '')) {
    fail('E2E run ID must match <timestamp>-<six-lowercase-hex-characters>.');
  }

  const config = {
    environment: options.environment,
    e2eRunId: options.e2eRunId,
    execute: options.execute === true,
    neo4jHttpUrl: options.neo4jHttpUrl || 'http://localhost:7474',
    neo4jDatabase: options.neo4jDatabase || 'neo4j',
    neo4jUsername: options.neo4jUsername || environment.NEO4J_USERNAME || 'neo4j',
    neo4jPassword: options.neo4jPassword || environment.NEO4J_PASSWORD || 'changeme',
    minioEndpoint: options.minioEndpoint || 'http://localhost:9000',
    minioBucket: options.minioBucket || 'mvpconnect-media',
    minioAccessKey: options.minioAccessKey || environment.MINIO_ROOT_USER || 'minioadmin',
    minioSecretKey: options.minioSecretKey || environment.MINIO_ROOT_PASSWORD || 'minioadmin',
  };

  config.neo4jUrl = assertLoopbackHttpUrl(config.neo4jHttpUrl, 'Neo4j HTTP URL');
  config.minioUrl = assertLoopbackHttpUrl(config.minioEndpoint, 'MinIO endpoint');
  if (config.minioBucket !== 'mvpconnect-media'
      && !ALLOWED_BUCKET_PATTERN.test(config.minioBucket)) {
    fail('MinIO bucket must be mvpconnect-media or an explicitly test-named bucket.');
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(config.neo4jDatabase)) {
    fail('Neo4j database contains unsupported characters.');
  }
  return config;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function exactEmailPattern(runId) {
  return `^e2e-(artist|venue|promoter|resume)-${escapeRegex(runId)}@example\\.local$`;
}

function validateTargets(rows, runId) {
  const emailPattern = new RegExp(exactEmailPattern(runId));
  const ownerIds = [];
  const emails = [];
  const objectKeys = new Set();

  for (const row of rows) {
    const [ownerId, email, , mediaItems] = row;
    if (!UUID_PATTERN.test(String(ownerId))) {
      fail('Cleanup target owner ID is not a server-generated UUID. Refusing cleanup.');
    }
    if (!emailPattern.test(String(email))) {
      fail('Cleanup target email failed the exact E2E run check. Refusing cleanup.');
    }
    ownerIds.push(String(ownerId));
    emails.push(String(email));

    for (const media of Array.isArray(mediaItems) ? mediaItems : []) {
      if (media == null || (media.id == null && media.objectKey == null)) continue;
      if (!UUID_PATTERN.test(String(media.id))) {
        fail('Cleanup target media ID is not a server-generated UUID. Refusing cleanup.');
      }
      const keyPattern = new RegExp(
        `^users/${escapeRegex(String(ownerId))}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`
      );
      if (!keyPattern.test(String(media.objectKey))) {
        fail('Cleanup target object key failed the owner-scoped media-key check. Refusing cleanup.');
      }
      objectKeys.add(String(media.objectKey));
    }
  }
  return { ownerIds, emails, objectKeys: [...objectKeys] };
}

async function neo4jStatement(config, statement, parameters) {
  const endpoint = new URL(
    `db/${encodeURIComponent(config.neo4jDatabase)}/tx/commit`,
    `${config.neo4jUrl.toString().replace(/\/$/, '')}/`
  );
  const authorization = Buffer.from(
    `${config.neo4jUsername}:${config.neo4jPassword}`,
    'utf8'
  ).toString('base64');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: `Basic ${authorization}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      statements: [{ statement, parameters, resultDataContents: ['row'] }],
    }),
  });
  if (!response.ok) fail(`Neo4j cleanup request failed with HTTP ${response.status}.`);
  const body = await response.json();
  if (body.errors?.length) {
    fail(`Neo4j rejected the local cleanup query: ${body.errors.map((error) => error.code).join(', ')}.`);
  }
  return (body.results?.[0]?.data || []).map((entry) => entry.row);
}

function sha256(value, encoding) {
  return crypto.createHash('sha256').update(value).digest(encoding);
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function awsEncodePath(pathname) {
  return pathname.split('/').map((segment) => encodeURIComponent(segment)
    .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`))
    .join('/');
}

function signedS3Request(config, method, objectKey, now = new Date()) {
  const endpoint = new URL(config.minioUrl);
  const basePath = endpoint.pathname.replace(/\/$/, '');
  endpoint.pathname = `${basePath}/${config.minioBucket}/${objectKey}`;
  const canonicalUri = awsEncodePath(endpoint.pathname);
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256('', 'hex');
  const canonicalHeaders = `host:${endpoint.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const scope = `${dateStamp}/us-east-1/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256(canonicalRequest, 'hex'),
  ].join('\n');
  const dateKey = hmac(`AWS4${config.minioSecretKey}`, dateStamp);
  const regionKey = hmac(dateKey, 'us-east-1');
  const serviceKey = hmac(regionKey, 's3');
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = hmac(signingKey, stringToSign, 'hex');

  return {
    url: endpoint,
    options: {
      method,
      headers: {
        authorization: `AWS4-HMAC-SHA256 Credential=${config.minioAccessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
    },
  };
}

async function removeMinioObject(config, objectKey) {
  const headRequest = signedS3Request(config, 'HEAD', objectKey);
  const head = await fetch(headRequest.url, headRequest.options);
  if (head.status === 404) return false;
  if (!head.ok) fail(`MinIO object check failed with HTTP ${head.status}. Graph data was not deleted; retry is safe.`);

  const deleteRequest = signedS3Request(config, 'DELETE', objectKey);
  const deletion = await fetch(deleteRequest.url, deleteRequest.options);
  if (!deletion.ok) fail(`MinIO cleanup failed with HTTP ${deletion.status}. Graph data was not deleted; retry is safe.`);
  return true;
}

async function cleanup(config, dependencies = {}) {
  const query = dependencies.neo4jStatement || neo4jStatement;
  const removeObject = dependencies.removeMinioObject || removeMinioObject;
  const emailPattern = exactEmailPattern(config.e2eRunId);
  const targetRows = await query(config, TARGET_QUERY, { emailPattern });
  const controlRows = await query(config, CONTROL_COUNT_QUERY, {
    allE2ePattern: ALL_E2E_EMAIL_PATTERN,
  });
  const controlCountBefore = Number(controlRows[0]?.[0] || 0);
  const targets = validateTargets(targetRows, config.e2eRunId);
  const plan = {
    mode: config.execute ? 'execute' : 'plan-only',
    environment: config.environment,
    e2eRunId: config.e2eRunId,
    matchedAccounts: targets.ownerIds.length,
    matchedMediaObjects: targets.objectKeys.length,
    emails: targets.emails,
    nonE2eControlAccountsBefore: controlCountBefore,
  };
  if (!config.execute) return plan;

  let objectsRemoved = 0;
  let objectsAlreadyAbsent = 0;
  for (const objectKey of targets.objectKeys) {
    if (await removeObject(config, objectKey)) objectsRemoved += 1;
    else objectsAlreadyAbsent += 1;
  }

  if (targets.ownerIds.length > 0) {
    await query(config, DELETE_QUERY, { ownerIds: targets.ownerIds, emailPattern });
  }
  const remainingRows = await query(
    config,
    'MATCH (owner) WHERE owner.id IN $ownerIds AND owner.email =~ $emailPattern RETURN count(owner)',
    { ownerIds: targets.ownerIds, emailPattern }
  );
  const controlRowsAfter = await query(config, CONTROL_COUNT_QUERY, {
    allE2ePattern: ALL_E2E_EMAIL_PATTERN,
  });
  const remainingTargets = Number(remainingRows[0]?.[0] || 0);
  const controlCountAfter = Number(controlRowsAfter[0]?.[0] || 0);
  if (remainingTargets !== 0) fail('Target E2E accounts remain after cleanup.');
  if (controlCountAfter !== controlCountBefore) {
    fail('Non-E2E control account count changed. Cleanup safety verification failed.');
  }
  return {
    ...plan,
    objectsRemoved,
    objectsAlreadyAbsent,
    remainingTargetAccounts: remainingTargets,
    nonE2eControlAccountsAfter: controlCountAfter,
    controlAccountsUnchanged: true,
  };
}

async function main() {
  const config = buildConfig(parseArgs(process.argv.slice(2)));
  const result = await cleanup(config);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Cleanup refused or failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  ALL_E2E_EMAIL_PATTERN,
  buildConfig,
  cleanup,
  exactEmailPattern,
  parseArgs,
  signedS3Request,
  validateTargets,
};
