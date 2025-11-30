#!/usr/bin/env node
/**
 * MCP Memory Server
 *
 * Ingests, stores, and searches AI conversation history across
 * Claude Code, Claude Desktop, and Cursor.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import * as path from "path";
import * as os from "os";
import { initOpenAI, generateEmbedding, generateEmbeddings } from "./embeddings.js";
import { initPinecone, upsertConversations, queryConversations, queryWithFilters, getIndexStats } from "./pinecone.js";
import { loadClaudeCodeSessions, getSessionStats } from "./parsers.js";
import { initTracing, withTrace, isTracingEnabled } from "./tracing.js";
import { getAvailableTopics, getAvailableMessageTypes } from "./tagging.js";
// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
// Use consistent index name - prioritize env var, fallback to standard name
const PINECONE_INDEX = process.env.PINECONE_INDEX || process.env.PINECONE_INDEX_NAME || "prayermap-agent-memory";
// Default paths for conversation sources
const CLAUDE_CODE_PROJECTS = process.env.CLAUDE_CODE_PROJECTS ||
    path.join(os.homedir(), ".claude", "projects");
let isInitialized = false;
/**
 * Initialize connections to OpenAI and Pinecone
 */
async function initialize() {
    if (isInitialized)
        return true;
    if (!OPENAI_API_KEY) {
        console.error("❌ OPENAI_API_KEY environment variable is required");
        console.error("   Get your API key from: https://platform.openai.com/api-keys");
        return false;
    }
    if (!PINECONE_API_KEY) {
        console.error("❌ PINECONE_API_KEY environment variable is required");
        console.error("   Get your API key from: https://app.pinecone.io/");
        console.error(`   Using index: ${PINECONE_INDEX}`);
        return false;
    }
    try {
        // Initialize LangSmith tracing (optional - continues if not configured)
        initTracing();
        initOpenAI(OPENAI_API_KEY);
        await initPinecone(PINECONE_API_KEY, PINECONE_INDEX);
        isInitialized = true;
        console.error(`✅ Memory server initialized successfully`);
        console.error(`   Pinecone Index: ${PINECONE_INDEX}`);
        console.error(`   OpenAI Model: text-embedding-3-large`);
        console.error(`   LangSmith: ${process.env.LANGSMITH_API_KEY ? '✅ Enabled' : '⚠️  Disabled (optional)'}`);
        return true;
    }
    catch (error) {
        console.error("Failed to initialize:", error);
        return false;
    }
}
/**
 * Main server setup
 */
async function main() {
    const server = new Server({
        name: "mcp-memory-server",
        version: "1.0.0",
    }, {
        capabilities: {
            tools: {},
        },
    });
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
                                description: "Filter by project name",
                            },
                            topics: {
                                type: "array",
                                items: { type: "string" },
                                description: "Filter by topics (e.g., ['react', 'typescript', 'database'])",
                            },
                            messageType: {
                                type: "string",
                                enum: ["question", "code-request", "explanation", "fix-request", "review-request", "refactor-request", "response", "general"],
                                description: "Filter by message type",
                            },
                            hasCode: {
                                type: "boolean",
                                description: "Filter for messages containing code",
                            },
                            dateRange: {
                                type: "object",
                                properties: {
                                    start: { type: "string", description: "Start date (YYYY-MM-DD)" },
                                    end: { type: "string", description: "End date (YYYY-MM-DD)" },
                                },
                                description: "Filter by date range",
                            },
                        },
                        required: ["query"],
                    },
                },
                {
                    name: "memory_ingest",
                    description: "Ingest conversation history from Claude Code into the memory database. Run this to update the memory with your latest conversations. Messages are auto-tagged with topics, types, and metadata.",
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
                {
                    name: "memory_topics",
                    description: "List all available topics for filtering searches. Shows the topic taxonomy used for auto-tagging.",
                    inputSchema: {
                        type: "object",
                        properties: {},
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
                    return await handleMemorySearch(args);
                case "memory_ingest":
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return await handleMemoryIngest(args);
                case "memory_stats":
                    return await handleMemoryStats();
                case "memory_context":
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return await handleMemoryContext(args);
                case "memory_topics":
                    return await handleMemoryTopics();
                default:
                    return {
                        content: [{ type: "text", text: `Unknown tool: ${name}` }],
                        isError: true,
                    };
            }
        }
        catch (error) {
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
 * Handle memory search requests with advanced filtering
 */
async function handleMemorySearch(args) {
    const { query, limit = 10, source = "all", project, topics, messageType, hasCode, dateRange } = args;
    const searchFn = async () => {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);
        // Use advanced filtering if any filters are specified
        const hasAdvancedFilters = topics || messageType || hasCode !== undefined || dateRange;
        if (hasAdvancedFilters) {
            return queryWithFilters(queryEmbedding, {
                topK: limit,
                topics,
                sources: source !== "all" ? [source] : undefined,
                projects: project ? [project] : undefined,
                messageTypes: messageType ? [messageType] : undefined,
                hasCode,
                dateRange,
            });
        }
        // Simple query with basic filters
        // Build filter
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const filter = {};
        if (source !== "all") {
            filter.source = { $eq: source };
        }
        if (project) {
            filter.projectName = { $eq: project };
        }
        return queryConversations(queryEmbedding, {
            topK: limit,
            filter: Object.keys(filter).length > 0 ? filter : undefined,
        });
    };
    // Execute with tracing if enabled
    const results = isTracingEnabled()
        ? await withTrace("memory_search", "retriever", { query, limit, source, project, topics, messageType, hasCode, dateRange }, searchFn, { tool: "memory_search" })
        : await searchFn();
    // Format results with enriched metadata
    const formattedResults = results.map((r, i) => {
        const meta = r.metadata;
        const topicsStr = meta.topics?.length > 0 ? meta.topics.join(", ") : "none";
        const tagsStr = meta.tags?.slice(0, 5).join(", ") || "none";
        return `### Result ${i + 1} (Score: ${(r.score * 100).toFixed(1)}%)
**Source:** ${meta.source} | **Project:** ${meta.projectName || "N/A"} | **Type:** ${meta.messageType || "general"}
**Date:** ${meta.date || meta.timestamp?.split("T")[0] || "N/A"} | **Role:** ${meta.role} | **Complexity:** ${meta.complexity || "N/A"}
**Topics:** ${topicsStr}
**Tags:** ${tagsStr}
${meta.hasCode ? "📝 Contains code" : ""} ${meta.hasError ? "⚠️ Error-related" : ""}

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
async function handleMemoryIngest(args) {
    const { source = "claude-code", projectFilter } = args;
    const ingestFn = async () => {
        console.error(`Ingesting conversations from ${source}...`);
        // Load sessions from Claude Code
        let sessions = loadClaudeCodeSessions(CLAUDE_CODE_PROJECTS);
        // Filter by project if specified
        if (projectFilter) {
            sessions = sessions.filter((s) => s.projectPath && s.projectPath.includes(projectFilter));
        }
        // Get stats
        const stats = getSessionStats(sessions);
        // Collect all messages
        const allMessages = [];
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
        ? await withTrace("memory_ingest", "chain", { source, projectFilter }, ingestFn, { tool: "memory_ingest" })
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
async function handleMemoryContext(args) {
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
    // Format as context with enriched metadata
    const contextParts = results.map((r) => {
        const meta = r.metadata;
        const topicsStr = meta.topics?.length > 0 ? ` [${meta.topics.join(", ")}]` : "";
        return `[${meta.source}]${topicsStr} ${meta.role}: ${meta.content}`;
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
/**
 * Handle memory topics request - show available taxonomy
 */
async function handleMemoryTopics() {
    const topics = getAvailableTopics();
    const messageTypes = getAvailableMessageTypes();
    const topicCategories = {
        "Frontend": ["frontend", "react"],
        "Backend": ["backend", "nodejs", "python"],
        "Database": ["database", "supabase"],
        "DevOps": ["devops", "git"],
        "Security": ["security"],
        "Testing": ["testing"],
        "Architecture": ["architecture"],
        "AI/ML": ["ai-ml"],
        "Mobile": ["mobile"],
        "Languages": ["typescript"],
        "Performance": ["performance"],
        "Debugging": ["debugging"],
    };
    let topicList = "## Available Topics for Filtering\n\n";
    for (const [category, categoryTopics] of Object.entries(topicCategories)) {
        topicList += `### ${category}\n`;
        for (const topic of categoryTopics) {
            topicList += `- \`${topic}\`\n`;
        }
        topicList += "\n";
    }
    topicList += `## Message Types\n\n`;
    for (const type of messageTypes) {
        topicList += `- \`${type}\`\n`;
    }
    topicList += `\n## Usage Examples\n\n`;
    topicList += "```\n";
    topicList += 'memory_search(query: "authentication", topics: ["security", "backend"])\n';
    topicList += 'memory_search(query: "component", topics: ["react"], hasCode: true)\n';
    topicList += 'memory_search(query: "error", messageType: "fix-request")\n';
    topicList += 'memory_search(query: "database", dateRange: {start: "2024-01-01", end: "2024-12-31"})\n';
    topicList += "```";
    return {
        content: [
            {
                type: "text",
                text: topicList,
            },
        ],
    };
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
