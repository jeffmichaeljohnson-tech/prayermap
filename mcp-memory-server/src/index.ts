#!/usr/bin/env node

/**
 * MCP Memory Server
 *
 * Ingests, stores, and searches AI conversation history across
 * Claude Code, Claude Desktop, and Cursor.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as path from "path";
import * as os from "os";

import { initOpenAI, generateEmbedding, generateEmbeddings } from "./embeddings.js";
import { initPinecone, upsertConversations, queryConversations, getIndexStats } from "./pinecone.js";
import { loadClaudeCodeSessions, getSessionStats, ConversationMessage } from "./parsers.js";
import { initTracing, withTrace, isTracingEnabled } from "./tracing.js";

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX = process.env.PINECONE_INDEX || "ora-prayermap";

// Default paths for conversation sources
const CLAUDE_CODE_PROJECTS = process.env.CLAUDE_CODE_PROJECTS ||
  path.join(os.homedir(), ".claude", "projects");

let isInitialized = false;

/**
 * Initialize connections to OpenAI and Pinecone
 */
async function initialize(): Promise<boolean> {
  if (isInitialized) return true;

  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY environment variable is required");
    return false;
  }

  if (!PINECONE_API_KEY) {
    console.error("PINECONE_API_KEY environment variable is required");
    return false;
  }

  try {
    // Initialize LangSmith tracing (optional - continues if not configured)
    initTracing();

    initOpenAI(OPENAI_API_KEY);
    await initPinecone(PINECONE_API_KEY, PINECONE_INDEX);
    isInitialized = true;
    console.error("Memory server initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize:", error);
    return false;
  }
}

/**
 * Main server setup
 */
async function main() {
  const server = new Server(
    {
      name: "mcp-memory-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "memory_search",
          description: "Search your AI conversation history for relevant past discussions. Returns similar conversations from Claude Code, Claude Desktop, and Cursor.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "What to search for in your conversation history",
              },
              limit: {
                type: "number",
                description: "Maximum number of results (default: 10)",
              },
              source: {
                type: "string",
                enum: ["claude-code", "claude-desktop", "cursor", "all"],
                description: "Filter by conversation source (default: all)",
              },
              project: {
                type: "string",
                description: "Filter by project path (substring match)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "memory_ingest",
          description: "Ingest conversation history from Claude Code into the memory database. Run this to update the memory with your latest conversations.",
          inputSchema: {
            type: "object",
            properties: {
              source: {
                type: "string",
                enum: ["claude-code", "all"],
                description: "Which source to ingest (default: claude-code)",
              },
              projectFilter: {
                type: "string",
                description: "Only ingest sessions from projects matching this path",
              },
            },
          },
        },
        {
          name: "memory_stats",
          description: "Get statistics about the memory database - total vectors, sources, and projects indexed.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "memory_context",
          description: "Get relevant context from past conversations to help with the current task. Automatically searches and formats results.",
          inputSchema: {
            type: "object",
            properties: {
              topic: {
                type: "string",
                description: "The topic or task you need context for",
              },
              maxResults: {
                type: "number",
                description: "Maximum results to include (default: 5)",
              },
            },
            required: ["topic"],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Initialize on first tool call
    if (!isInitialized) {
      const success = await initialize();
      if (!success) {
        return {
          content: [
            {
              type: "text",
              text: "Failed to initialize memory server. Check OPENAI_API_KEY and PINECONE_API_KEY environment variables.",
            },
          ],
          isError: true,
        };
      }
    }

    try {
      switch (name) {
        case "memory_search":
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await handleMemorySearch(args as any);
        case "memory_ingest":
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await handleMemoryIngest(args as any);
        case "memory_stats":
          return await handleMemoryStats();
        case "memory_context":
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return await handleMemoryContext(args as any);
        default:
          return {
            content: [{ type: "text", text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Memory Server running on stdio");
}

/**
 * Handle memory search requests
 */
async function handleMemorySearch(args: {
  query: string;
  limit?: number;
  source?: string;
  project?: string;
}) {
  const { query, limit = 10, source = "all", project } = args;

  const searchFn = async () => {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (source !== "all") {
      filter.source = { $eq: source };
    }
    if (project) {
      filter.projectPath = { $contains: project };
    }

    // Query Pinecone
    const results = await queryConversations(queryEmbedding, {
      topK: limit,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    return results;
  };

  // Execute with tracing if enabled
  const results = isTracingEnabled()
    ? await withTrace(
        "memory_search",
        "retriever",
        { query, limit, source, project },
        searchFn,
        { tool: "memory_search" }
      )
    : await searchFn();

  // Format results
  const formattedResults = results.map((r, i) => {
    const meta = r.metadata;
    return `### Result ${i + 1} (Score: ${(r.score * 100).toFixed(1)}%)
**Source:** ${meta.source} | **Session:** ${meta.sessionId.slice(0, 8)}...
**Project:** ${meta.projectPath || "N/A"}
**Timestamp:** ${meta.timestamp}
**Role:** ${meta.role}

${meta.content}
`;
  });

  return {
    content: [
      {
        type: "text",
        text: `## Memory Search Results for: "${query}"

Found ${results.length} relevant conversations:

${formattedResults.join("\n---\n\n")}`,
      },
    ],
  };
}

/**
 * Handle memory ingestion requests
 */
async function handleMemoryIngest(args: {
  source?: string;
  projectFilter?: string;
}) {
  const { source = "claude-code", projectFilter } = args;

  const ingestFn = async () => {
    console.error(`Ingesting conversations from ${source}...`);

    // Load sessions from Claude Code
    let sessions = loadClaudeCodeSessions(CLAUDE_CODE_PROJECTS);

    // Filter by project if specified
    if (projectFilter) {
      sessions = sessions.filter(
        (s) => s.projectPath && s.projectPath.includes(projectFilter)
      );
    }

    // Get stats
    const stats = getSessionStats(sessions);

    // Collect all messages
    const allMessages: ConversationMessage[] = [];
    for (const session of sessions) {
      allMessages.push(...session.messages);
    }

    if (allMessages.length === 0) {
      return { stats, result: { upserted: 0, errors: 0 }, empty: true };
    }

    console.error(`Generating embeddings for ${allMessages.length} messages...`);

    // Generate embeddings for all messages
    const texts = allMessages.map((m) => m.content);
    const embeddings = await generateEmbeddings(texts);

    console.error(`Upserting to Pinecone...`);

    // Upsert to Pinecone
    const result = await upsertConversations(allMessages, embeddings);

    return { stats, result, empty: false };
  };

  // Execute with tracing if enabled
  const { stats, result, empty } = isTracingEnabled()
    ? await withTrace(
        "memory_ingest",
        "chain",
        { source, projectFilter },
        ingestFn,
        { tool: "memory_ingest" }
      )
    : await ingestFn();

  if (empty) {
    return {
      content: [
        {
          type: "text",
          text: "No conversations found to ingest.",
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `## Memory Ingestion Complete

**Sessions processed:** ${stats.totalSessions}
**Messages ingested:** ${result.upserted}
**Errors:** ${result.errors}

**By Source:**
${Object.entries(stats.bySource)
  .map(([s, c]) => `- ${s}: ${c} sessions`)
  .join("\n")}

**By Project:**
${Object.entries(stats.byProject)
  .map(([p, c]) => `- ${p}: ${c} sessions`)
  .join("\n")}
`,
      },
    ],
  };
}

/**
 * Handle memory stats requests
 */
async function handleMemoryStats() {
  const indexStats = await getIndexStats();

  return {
    content: [
      {
        type: "text",
        text: `## Memory Database Statistics

**Total Vectors:** ${indexStats.totalVectors.toLocaleString()}
**Embedding Dimension:** ${indexStats.dimension}
**Index:** ${PINECONE_INDEX}

Use \`memory_ingest\` to add more conversations to the database.
Use \`memory_search\` to query your conversation history.
`,
      },
    ],
  };
}

/**
 * Handle memory context requests
 */
async function handleMemoryContext(args: {
  topic: string;
  maxResults?: number;
}) {
  const { topic, maxResults = 5 } = args;

  // Generate embedding for the topic
  const topicEmbedding = await generateEmbedding(topic);

  // Query for relevant conversations
  const results = await queryConversations(topicEmbedding, {
    topK: maxResults,
  });

  if (results.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No relevant past conversations found for: "${topic}"`,
        },
      ],
    };
  }

  // Format as context
  const contextParts = results.map((r) => {
    const meta = r.metadata;
    return `[${meta.source}] ${meta.role}: ${meta.content}`;
  });

  return {
    content: [
      {
        type: "text",
        text: `## Relevant Context from Past Conversations

Topic: "${topic}"

${contextParts.join("\n\n---\n\n")}

---
*Retrieved ${results.length} relevant snippets from your conversation history.*
`,
      },
    ],
  };
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
