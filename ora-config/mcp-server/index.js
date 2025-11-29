#!/usr/bin/env node

/**
 * Ora MCP Server
 * Provides Claude with direct access to Pinecone memory and PostgreSQL state.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Pinecone } from '@pinecone-database/pinecone';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const { Pool } = pg;
let pinecone = null;
let pgPool = null;

async function initializeClients() {
  if (process.env.PINECONE_API_KEY) {
    pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  }
  if (process.env.DB_HOST) {
    pgPool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
    });
  }
}

const tools = [
  {
    name: 'ora_tasks_list',
    description: 'List tasks from PostgreSQL ora_prayermap schema',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'assigned', 'in_progress', 'blocked', 'completed'] },
        limit: { type: 'number', description: 'Max results (default 20)' },
      },
    },
  },
  {
    name: 'ora_tasks_create',
    description: 'Create a new task',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        type: { type: 'string', enum: ['implementation', 'research', 'qa', 'documentation'] },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        title: { type: 'string' },
        description: { type: 'string' },
        assignedTo: { type: 'string' },
      },
      required: ['id', 'type', 'priority', 'title'],
    },
  },
  {
    name: 'ora_tasks_update',
    description: 'Update task status',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'assigned', 'in_progress', 'blocked', 'completed'] },
      },
      required: ['id'],
    },
  },
  {
    name: 'ora_decisions_log',
    description: 'Log a director decision',
    inputSchema: {
      type: 'object',
      properties: {
        decisionType: { type: 'string' },
        decision: { type: 'string' },
        rationale: { type: 'string' },
      },
      required: ['decisionType', 'decision'],
    },
  },
  {
    name: 'ora_slack_post',
    description: 'Post to Slack channel',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        channel: { type: 'string', description: 'Default: ora-prayermap-agents' },
      },
      required: ['message'],
    },
  },
];

async function handleToolCall(name, args) {
  switch (name) {
    case 'ora_tasks_list': {
      if (!pgPool) return { error: 'PostgreSQL not configured' };
      const { status, limit = 20 } = args;
      let query = 'SELECT * FROM ora_prayermap.tasks WHERE 1=1';
      const params = [];
      if (status) { query += ` AND status = $${params.length + 1}`; params.push(status); }
      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);
      const result = await pgPool.query(query, params);
      return { tasks: result.rows };
    }
    case 'ora_tasks_create': {
      if (!pgPool) return { error: 'PostgreSQL not configured' };
      const { id, type, priority, title, description, assignedTo } = args;
      const result = await pgPool.query(
        `INSERT INTO ora_prayermap.tasks (id, type, priority, title, description, assigned_to, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
        [id, type, priority, title, description || '', assignedTo || null, assignedTo ? 'assigned' : 'pending']
      );
      return { task: result.rows[0] };
    }
    case 'ora_tasks_update': {
      if (!pgPool) return { error: 'PostgreSQL not configured' };
      const { id, status } = args;
      const result = await pgPool.query(
        `UPDATE ora_prayermap.tasks SET status = $1 WHERE id = $2 RETURNING *`,
        [status, id]
      );
      return { task: result.rows[0] };
    }
    case 'ora_decisions_log': {
      if (!pgPool) return { error: 'PostgreSQL not configured' };
      const { decisionType, decision, rationale } = args;
      const result = await pgPool.query(
        `INSERT INTO ora_prayermap.director_decisions (decision_type, decision, rationale, created_at)
         VALUES ($1, $2, $3, NOW()) RETURNING *`,
        [decisionType, decision, rationale || '']
      );
      return { decision: result.rows[0] };
    }
    case 'ora_slack_post': {
      const token = process.env.SLACK_BOT_TOKEN;
      if (!token) return { error: 'Slack not configured' };
      const { message, channel = 'ora-prayermap-agents' } = args;
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: `#${channel}`, text: message }),
      });
      const data = await response.json();
      return data.ok ? { posted: true } : { error: data.error };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function main() {
  await initializeClients();
  const server = new Server({ name: 'ora-mcp-server', version: '1.0.0' }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await handleToolCall(name, args || {});
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }], isError: true };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Ora MCP Server running');
}

main().catch(console.error);
