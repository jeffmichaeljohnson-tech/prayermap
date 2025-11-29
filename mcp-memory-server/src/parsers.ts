/**
 * Conversation parsers for different AI tools
 */

import * as fs from "fs";
import * as path from "path";

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
export function parseClaudeCodeSession(filePath: string): ConversationSession | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n").filter(line => line.trim());

    if (lines.length === 0) return null;

    const sessionId = path.basename(filePath, ".jsonl");
    const messages: ConversationMessage[] = [];
    let projectPath: string | undefined;
    let startTime: string | undefined;
    let endTime: string | undefined;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);

        // Extract project path from first entry with cwd
        if (entry.cwd && !projectPath) {
          projectPath = entry.cwd;
        }

        // Track timestamps
        if (entry.timestamp) {
          if (!startTime) startTime = entry.timestamp;
          endTime = entry.timestamp;
        }

        // Parse user messages
        if (entry.type === "user" && entry.message?.content) {
          const textContent = extractTextContent(entry.message.content);
          if (textContent) {
            messages.push({
              id: entry.uuid || `${sessionId}-user-${messages.length}`,
              role: "user",
              content: textContent,
              timestamp: entry.timestamp || new Date().toISOString(),
              source: "claude-code",
              sessionId,
              projectPath,
            });
          }
        }

        // Parse assistant messages
        if (entry.type === "assistant" && entry.message?.content) {
          const textContent = extractTextContent(entry.message.content);
          if (textContent) {
            messages.push({
              id: entry.uuid || `${sessionId}-assistant-${messages.length}`,
              role: "assistant",
              content: textContent,
              timestamp: entry.timestamp || new Date().toISOString(),
              source: "claude-code",
              sessionId,
              projectPath,
              model: entry.message.model,
            });
          }
        }
      } catch (parseError) {
        // Skip malformed lines
        continue;
      }
    }

    if (messages.length === 0) return null;

    return {
      id: sessionId,
      source: "claude-code",
      projectPath,
      startTime: startTime || new Date().toISOString(),
      endTime,
      messages,
    };
  } catch (error) {
    console.error(`Error parsing Claude Code session ${filePath}:`, error);
    return null;
  }
}

/**
 * Extract text content from message content array
 */
function extractTextContent(content: any): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const textParts: string[] = [];
    for (const item of content) {
      if (typeof item === "string") {
        textParts.push(item);
      } else if (item.type === "text" && item.text) {
        textParts.push(item.text);
      }
    }
    return textParts.join("\n").trim();
  }

  return "";
}

/**
 * Load all Claude Code sessions from the projects directory
 */
export function loadClaudeCodeSessions(projectsDir: string): ConversationSession[] {
  const sessions: ConversationSession[] = [];

  if (!fs.existsSync(projectsDir)) {
    console.error(`Claude Code projects directory not found: ${projectsDir}`);
    return sessions;
  }

  const projectDirs = fs.readdirSync(projectsDir);

  for (const projectDir of projectDirs) {
    const projectPath = path.join(projectsDir, projectDir);
    const stat = fs.statSync(projectPath);

    if (!stat.isDirectory()) continue;

    const files = fs.readdirSync(projectPath);

    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;

      const filePath = path.join(projectPath, file);
      const session = parseClaudeCodeSession(filePath);

      if (session && session.messages.length > 0) {
        sessions.push(session);
      }
    }
  }

  return sessions;
}

/**
 * Get summary stats for loaded sessions
 */
export function getSessionStats(sessions: ConversationSession[]): {
  totalSessions: number;
  totalMessages: number;
  bySource: Record<string, number>;
  byProject: Record<string, number>;
} {
  const stats = {
    totalSessions: sessions.length,
    totalMessages: 0,
    bySource: {} as Record<string, number>,
    byProject: {} as Record<string, number>,
  };

  for (const session of sessions) {
    stats.totalMessages += session.messages.length;
    stats.bySource[session.source] = (stats.bySource[session.source] || 0) + 1;

    if (session.projectPath) {
      const projectName = path.basename(session.projectPath);
      stats.byProject[projectName] = (stats.byProject[projectName] || 0) + 1;
    }
  }

  return stats;
}
