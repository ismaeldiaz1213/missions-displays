/**
 * Seeds North America missionaries from mockData.ts into DynamoDB.
 *
 * Usage:
 *   npx tsx seed-na.ts <TABLE_NAME> [--region us-east-1]
 *
 * Find your table name:
 *   aws dynamodb list-tables --region us-east-1
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { mockMissionaries } from './src/mockData.js';

const TABLE_NAME = process.argv[2];
const REGION = process.argv.includes('--region')
  ? process.argv[process.argv.indexOf('--region') + 1]
  : 'us-east-1';

if (!TABLE_NAME) {
  console.error('\nUsage: npx tsx seed-na.ts <TABLE_NAME> [--region us-east-1]');
  console.error('\nFind your table name:');
  console.error('  aws dynamodb list-tables --region us-east-1\n');
  process.exit(1);
}

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const naMissionaries = mockMissionaries.filter(m => m.continent === 'north-america');
console.log(`\nSeeding ${naMissionaries.length} North America missionaries to ${TABLE_NAME} (${REGION})...\n`);

// Check for existing items to avoid overwriting real data
const existing = await db.send(new ScanCommand({
  TableName: TABLE_NAME,
  FilterExpression: 'continent = :c',
  ExpressionAttributeValues: { ':c': 'north-america' },
  Select: 'COUNT',
}));

if ((existing.Count ?? 0) > 0) {
  console.warn(`⚠ Table already has ${existing.Count} North America entries.`);
  console.warn('  Continuing will overwrite missionaries with the same ID.\n');
}

let seeded = 0;
let failed = 0;

for (const missionary of naMissionaries) {
  try {
    await db.send(new PutCommand({ TableName: TABLE_NAME, Item: missionary }));
    console.log(`  ✓ ${missionary.name} ${missionary.lastName} — ${missionary.location.city}`);
    seeded++;
  } catch (err) {
    console.error(`  ✗ Failed: ${missionary.name} ${missionary.lastName} — ${String(err)}`);
    failed++;
  }
}

console.log(`\nDone. ${seeded} seeded, ${failed} failed.\n`);
