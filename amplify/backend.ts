import { defineBackend } from '@aws-amplify/backend';
import { Duration, Stack } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { join } from 'path';
import { auth } from './auth/resource';
import { storage } from './storage/resource';

// missionaryFunction is NOT in defineBackend — it lives entirely inside
// MissionaryApiStack below to avoid circular cross-stack dependencies.
const backend = defineBackend({ auth, storage });

const apiStack = backend.createStack('MissionaryApiStack');

// DynamoDB — free tier: 25 WCU/RCU + 25 GB storage forever
const table = new Table(apiStack, 'MissionariesTable', {
  partitionKey: { name: 'id', type: AttributeType.STRING },
  billingMode: BillingMode.PAY_PER_REQUEST,
});

table.addGlobalSecondaryIndex({
  indexName: 'continent-index',
  partitionKey: { name: 'continent', type: AttributeType.STRING },
  sortKey: { name: 'id', type: AttributeType.STRING },
});

// Lambda defined directly here — same stack as DynamoDB, no cross-stack refs
const missionaryFn = new NodejsFunction(apiStack, 'MissionaryFunction', {
  entry: join(process.cwd(), 'amplify', 'functions', 'missionaries', 'handler.ts'),
  runtime: Runtime.NODEJS_20_X,
  timeout: Duration.seconds(30),
  environment: { TABLE_NAME: table.tableName },
  bundling: {
    // AWS SDK v3 is built into Lambda Node 20 — don't bundle it
    externalModules: ['@aws-sdk/*'],
  },
});

table.grantReadWriteData(missionaryFn);

// API Gateway REST API — free tier: 1M calls/month
const api = new RestApi(apiStack, 'MissionaryApi', {
  restApiName: 'missionaries-api',
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: ['Content-Type', 'Authorization'],
  },
});

// Admin-only routes require a valid Cognito token
const authorizer = new CognitoUserPoolsAuthorizer(apiStack, 'AdminAuthorizer', {
  cognitoUserPools: [backend.auth.resources.userPool],
  authorizerName: 'admin-authorizer',
  resultsCacheTtl: Duration.seconds(0),
});

const integration = new LambdaIntegration(missionaryFn);

// GET /missionaries — public | POST — admin only
const missionaries = api.root.addResource('missionaries');
missionaries.addMethod('GET', integration);
missionaries.addMethod('POST', integration, {
  authorizer,
  authorizationType: AuthorizationType.COGNITO,
});

// GET /missionaries/continent/{continent} — public
// Defined before /{id} so the literal "continent" segment wins
missionaries.addResource('continent').addResource('{continent}').addMethod('GET', integration);

// GET /missionaries/{id} — public | PUT/DELETE — admin only
const missionary = missionaries.addResource('{id}');
missionary.addMethod('GET', integration);
missionary.addMethod('PUT', integration, {
  authorizer,
  authorizationType: AuthorizationType.COGNITO,
});
missionary.addMethod('DELETE', integration, {
  authorizer,
  authorizationType: AuthorizationType.COGNITO,
});

// Expose API URL to frontend via amplify_outputs.json
backend.addOutput({
  custom: {
    API: {
      endpoint: api.url,
      region: Stack.of(apiStack).region,
    },
  },
});
