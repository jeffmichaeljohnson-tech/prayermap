/**
 * Content analysis and auto-tagging for conversation messages
 */
export interface EnrichedMetadata {
    id: string;
    sessionId: string;
    source: "claude-code" | "claude-desktop" | "cursor" | "github";
    projectPath: string;
    projectName: string;
    timestamp: string;
    date: string;
    week: string;
    month: string;
    quarter: string;
    role: "user" | "assistant" | "system";
    messageType: string;
    topics: string[];
    tags: string[];
    tools: string[];
    hasCode: boolean;
    hasError: boolean;
    complexity: "simple" | "medium" | "complex";
    content: string;
    contentLength: number;
}
/**
 * Analyze content and generate enriched metadata
 */
export declare function analyzeContent(content: string, role: "user" | "assistant" | "system", baseMetadata: {
    id: string;
    sessionId: string;
    source: "claude-code" | "claude-desktop" | "cursor" | "github";
    projectPath: string;
    timestamp: string;
    model?: string;
}): EnrichedMetadata;
/**
 * Get all available topic categories
 */
export declare function getAvailableTopics(): string[];
/**
 * Get all available message types
 */
export declare function getAvailableMessageTypes(): string[];
