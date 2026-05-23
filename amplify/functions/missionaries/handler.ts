import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME!;

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

const respond = (statusCode: number, body?: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: HEADERS,
  body: body !== undefined ? JSON.stringify(body) : '',
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { httpMethod, resource, pathParameters, body } = event;

  try {
    // GET /missionaries/continent/{continent}
    if (resource === '/missionaries/continent/{continent}' && httpMethod === 'GET') {
      const { Items } = await db.send(new QueryCommand({
        TableName: TABLE,
        IndexName: 'continent-index',
        KeyConditionExpression: 'continent = :c',
        ExpressionAttributeValues: { ':c': pathParameters?.continent },
      }));
      return respond(200, Items ?? []);
    }

    // /missionaries/{id}
    if (resource === '/missionaries/{id}') {
      const id = pathParameters?.id!;
      if (httpMethod === 'GET') {
        const { Item } = await db.send(new GetCommand({ TableName: TABLE, Key: { id } }));
        return Item ? respond(200, Item) : respond(404, { error: 'Not found' });
      }
      if (httpMethod === 'PUT') {
        const item = { ...JSON.parse(body ?? '{}'), id };
        await db.send(new PutCommand({ TableName: TABLE, Item: item }));
        return respond(200, item);
      }
      if (httpMethod === 'DELETE') {
        await db.send(new DeleteCommand({ TableName: TABLE, Key: { id } }));
        return respond(204);
      }
    }

    // /missionaries
    if (resource === '/missionaries') {
      if (httpMethod === 'GET') {
        const { Items } = await db.send(new ScanCommand({ TableName: TABLE }));
        return respond(200, Items ?? []);
      }
      if (httpMethod === 'POST') {
        const item = { ...JSON.parse(body ?? '{}'), id: randomUUID() };
        await db.send(new PutCommand({ TableName: TABLE, Item: item }));
        return respond(201, item);
      }
    }

    return respond(400, { error: 'Invalid request' });
  } catch (err) {
    console.error(err);
    return respond(500, { error: String(err) });
  }
};
