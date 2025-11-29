/**
 * Conversation parsers for different AI tools
 */
export interface ConversationMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string;
    source: "claude-code" | "claude-desktop" | "cursor";
    sessionId: string;
    projectPath?: string;
    model?: string;
}
export interface ConversationSession {
    id: string;
    source: "claude-code" | "claude-desktop" | "cursor";
    projectPath?: string;
    startTime: string;
    endTime?: string;
    messages: ConversationMessage[];
}
/**
 * Parse Claude Code JSONL conversation files
 */
export declare function parseClaudeCodeSession(filePath: string): ConversationSession | null;
/**
 * Load all Claude Code sessions from the projects directory
 */
export declare function loadClaudeCodeSessions(projectsDir: string): ConversationSession[];
/**
 * Get summary stats for loaded sessions
 */
export declare function getSessionStats(sessions: ConversationSession[]): {
    totalSessions: number;
    totalMessages: number;
    bySource: Record<string, number>;
    byProject: Record<string, number>;
};
