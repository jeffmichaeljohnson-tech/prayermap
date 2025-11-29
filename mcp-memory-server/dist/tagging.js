/**
 * Content analysis and auto-tagging for conversation messages
 */
// Topic categories with their associated keywords
const TOPIC_KEYWORDS = {
    // Frontend
    "frontend": ["react", "vue", "angular", "css", "html", "dom", "component", "jsx", "tsx", "tailwind", "styled", "ui", "ux"],
    "react": ["react", "useState", "useEffect", "useContext", "useMemo", "useCallback", "useRef", "jsx", "tsx", "component", "props", "state"],
    // Backend
    "backend": ["api", "server", "express", "fastapi", "django", "flask", "endpoint", "route", "middleware", "controller"],
    "nodejs": ["node", "npm", "express", "fastify", "nest", "koa", "middleware"],
    "python": ["python", "pip", "django", "flask", "fastapi", "pandas", "numpy"],
    // Database
    "database": ["sql", "postgres", "postgresql", "mysql", "mongodb", "supabase", "prisma", "orm", "query", "table", "schema", "migration"],
    "supabase": ["supabase", "rls", "row level security", "realtime", "edge function"],
    // DevOps & Infrastructure
    "devops": ["docker", "kubernetes", "k8s", "ci/cd", "github actions", "deployment", "nginx", "aws", "gcp", "azure", "vercel"],
    "git": ["git", "commit", "branch", "merge", "rebase", "pull request", "pr", "github"],
    // Security
    "security": ["auth", "authentication", "authorization", "jwt", "oauth", "csrf", "xss", "injection", "security", "encrypt", "password", "token"],
    // Testing
    "testing": ["test", "jest", "vitest", "cypress", "playwright", "unit test", "integration test", "e2e", "mock", "stub"],
    // Architecture
    "architecture": ["pattern", "design", "solid", "dry", "architecture", "microservice", "monolith", "refactor", "abstraction"],
    // AI/ML
    "ai-ml": ["openai", "langchain", "embedding", "vector", "llm", "gpt", "claude", "anthropic", "pinecone", "rag"],
    // Mobile
    "mobile": ["react native", "expo", "ios", "android", "mobile", "app"],
    // TypeScript
    "typescript": ["typescript", "type", "interface", "generic", "enum", "ts"],
    // Performance
    "performance": ["optimize", "performance", "cache", "lazy", "memo", "bundle", "speed", "latency"],
    // Error Handling
    "debugging": ["error", "bug", "fix", "debug", "issue", "problem", "crash", "exception", "stack trace"],
};
// Message type patterns
const MESSAGE_TYPE_PATTERNS = {
    "question": [/\?$/, /^(how|what|why|when|where|can|could|would|should|is|are|do|does)/i],
    "code-request": [/write|create|implement|build|make|add|generate/i],
    "explanation": [/explain|describe|what is|how does/i],
    "fix-request": [/fix|solve|resolve|debug|error|bug|issue|problem/i],
    "review-request": [/review|check|look at|feedback/i],
    "refactor-request": [/refactor|improve|optimize|clean up/i],
};
// Tool patterns to detect tool usage in assistant messages
const TOOL_PATTERNS = {
    "read-file": /Read\(|reading.*file|read the file/i,
    "write-file": /Write\(|writing.*file|wrote.*file|created.*file/i,
    "edit-file": /Edit\(|editing.*file|edited.*file|modified/i,
    "bash": /Bash\(|running.*command|executed|npm|git|yarn/i,
    "search": /Grep\(|Glob\(|searching|search.*for/i,
    "web": /WebFetch|WebSearch|fetching.*url/i,
};
/**
 * Analyze content and generate enriched metadata
 */
export function analyzeContent(content, role, baseMetadata) {
    const contentLower = content.toLowerCase();
    // Extract project name from path
    const projectName = extractProjectName(baseMetadata.projectPath);
    // Parse timestamp for temporal buckets
    const date = new Date(baseMetadata.timestamp);
    const temporal = getTemporalBuckets(date);
    // Detect topics
    const topics = detectTopics(contentLower);
    // Detect message type
    const messageType = detectMessageType(content, role);
    // Detect tools used
    const tools = role === "assistant" ? detectTools(content) : [];
    // Generate tags
    const tags = generateTags(content, topics, messageType, tools, role);
    // Content flags
    const hasCode = detectCode(content);
    const hasError = detectError(contentLower);
    const complexity = assessComplexity(content, hasCode);
    return {
        id: baseMetadata.id,
        sessionId: baseMetadata.sessionId,
        source: baseMetadata.source,
        projectPath: baseMetadata.projectPath,
        projectName,
        timestamp: baseMetadata.timestamp,
        ...temporal,
        role,
        messageType,
        topics,
        tags,
        tools,
        hasCode,
        hasError,
        complexity,
        content: truncateContent(content, 1000),
        contentLength: content.length,
    };
}
/**
 * Extract clean project name from path
 */
function extractProjectName(projectPath) {
    if (!projectPath)
        return "unknown";
    // Get the last meaningful directory name
    const parts = projectPath.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1];
    // Handle common patterns
    if (lastPart === "projects" && parts.length > 1) {
        return parts[parts.length - 2];
    }
    return lastPart || "unknown";
}
/**
 * Get temporal bucket strings for filtering
 */
function getTemporalBuckets(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    // ISO week number
    const weekNum = getISOWeek(date);
    // Quarter
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    return {
        date: `${year}-${month}-${day}`,
        week: `${year}-W${String(weekNum).padStart(2, "0")}`,
        month: `${year}-${month}`,
        quarter: `${year}-Q${quarter}`,
    };
}
/**
 * Get ISO week number
 */
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
/**
 * Detect topics from content
 */
function detectTopics(contentLower) {
    const detected = [];
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
        for (const keyword of keywords) {
            if (contentLower.includes(keyword.toLowerCase())) {
                if (!detected.includes(topic)) {
                    detected.push(topic);
                }
                break;
            }
        }
    }
    return detected.slice(0, 5); // Limit to top 5 topics
}
/**
 * Detect message type
 */
function detectMessageType(content, role) {
    if (role === "assistant") {
        return "response";
    }
    for (const [type, patterns] of Object.entries(MESSAGE_TYPE_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(content)) {
                return type;
            }
        }
    }
    return "general";
}
/**
 * Detect tools used in assistant messages
 */
function detectTools(content) {
    const tools = [];
    for (const [tool, pattern] of Object.entries(TOOL_PATTERNS)) {
        if (pattern.test(content)) {
            tools.push(tool);
        }
    }
    return tools;
}
/**
 * Generate tags based on analysis
 */
function generateTags(content, topics, messageType, tools, role) {
    const tags = [];
    // Add role tag
    tags.push(`role:${role}`);
    // Add message type tag
    tags.push(`type:${messageType}`);
    // Add topic tags
    for (const topic of topics) {
        tags.push(`topic:${topic}`);
    }
    // Add tool tags
    for (const tool of tools) {
        tags.push(`tool:${tool}`);
    }
    // Add content-based tags
    if (content.length > 2000) {
        tags.push("length:long");
    }
    else if (content.length > 500) {
        tags.push("length:medium");
    }
    else {
        tags.push("length:short");
    }
    return tags.slice(0, 15); // Limit total tags
}
/**
 * Detect if content contains code
 */
function detectCode(content) {
    const codePatterns = [
        /```[\s\S]*?```/, // Fenced code blocks
        /`[^`]+`/, // Inline code
        /function\s+\w+\s*\(/, // Function declarations
        /const\s+\w+\s*=/, // Const declarations
        /import\s+.*from/, // Import statements
        /export\s+(default\s+)?/, // Export statements
        /=>\s*{/, // Arrow functions
        /class\s+\w+/, // Class declarations
    ];
    return codePatterns.some(pattern => pattern.test(content));
}
/**
 * Detect if content contains error-related text
 */
function detectError(contentLower) {
    const errorPatterns = [
        "error",
        "exception",
        "failed",
        "failure",
        "crash",
        "bug",
        "issue",
        "problem",
        "undefined",
        "null",
        "stack trace",
    ];
    return errorPatterns.some(pattern => contentLower.includes(pattern));
}
/**
 * Assess complexity of content
 */
function assessComplexity(content, hasCode) {
    const length = content.length;
    const lineCount = content.split("\n").length;
    if (length > 3000 || lineCount > 50 || (hasCode && lineCount > 20)) {
        return "complex";
    }
    else if (length > 1000 || lineCount > 15 || hasCode) {
        return "medium";
    }
    return "simple";
}
/**
 * Truncate content for metadata storage
 */
function truncateContent(content, maxLength) {
    if (content.length <= maxLength)
        return content;
    return content.slice(0, maxLength - 3) + "...";
}
/**
 * Get all available topic categories
 */
export function getAvailableTopics() {
    return Object.keys(TOPIC_KEYWORDS);
}
/**
 * Get all available message types
 */
export function getAvailableMessageTypes() {
    return ["question", "code-request", "explanation", "fix-request", "review-request", "refactor-request", "response", "general"];
}
