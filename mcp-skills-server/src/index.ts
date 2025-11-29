#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";

// Skill definition interface
interface SkillDefinition {
  name: string;
  description: string;
  content: string;
  parameters?: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
}

// Get skills directory from environment or use default
const SKILLS_DIR = process.env.SKILLS_DIR || path.join(process.cwd(), ".claude", "skills");

/**
 * Load all skills from the skills directory
 */
function loadSkills(): Map<string, SkillDefinition> {
  const skills = new Map<string, SkillDefinition>();

  if (!fs.existsSync(SKILLS_DIR)) {
    console.error(`Skills directory not found: ${SKILLS_DIR}`);
    return skills;
  }

  const files = fs.readdirSync(SKILLS_DIR);

  for (const file of files) {
    const filePath = path.join(SKILLS_DIR, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      try {
        const skill = parseSkillFile(filePath, file);
        if (skill) {
          skills.set(skill.name, skill);
        }
      } catch (error) {
        console.error(`Error loading skill from ${file}:`, error);
      }
    }
  }

  return skills;
}

/**
 * Parse a skill file (supports .json and .md formats)
 */
function parseSkillFile(filePath: string, fileName: string): SkillDefinition | null {
  const ext = path.extname(fileName).toLowerCase();
  const baseName = path.basename(fileName, ext);

  if (ext === ".json") {
    const content = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(content);
    return {
      name: json.name || baseName,
      description: json.description || `Skill: ${baseName}`,
      content: json.content || json.prompt || "",
      parameters: json.parameters,
    };
  } else if (ext === ".md" || ext === ".txt") {
    const content = fs.readFileSync(filePath, "utf-8");

    // Check for YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (frontmatterMatch) {
      const frontmatter = parseFrontmatter(frontmatterMatch[1]);
      return {
        name: frontmatter.name || baseName,
        description: frontmatter.description || `Skill: ${baseName}`,
        content: frontmatterMatch[2].trim(),
        parameters: frontmatter.parameters,
      };
    }

    // No frontmatter - use first line as description
    const lines = content.split("\n");
    const firstLine = lines[0].replace(/^#\s*/, "").trim();

    return {
      name: baseName,
      description: firstLine || `Skill: ${baseName}`,
      content: content,
    };
  }

  return null;
}

/**
 * Simple YAML frontmatter parser
 */
function parseFrontmatter(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split("\n");

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Handle quoted strings
      if (value.startsWith('"') && value.endsWith('"')) {
        result[key] = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        result[key] = value.slice(1, -1);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Main server setup
 */
async function main() {
  // Load skills
  const skills = loadSkills();
  console.error(`Loaded ${skills.size} skills from ${SKILLS_DIR}`);

  // Create MCP server
  const server = new Server(
    {
      name: "mcp-skills-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = [];

    for (const [name, skill] of skills) {
      const inputSchema: Record<string, any> = {
        type: "object",
        properties: {},
        required: [],
      };

      // Add parameters if defined
      if (skill.parameters) {
        for (const [paramName, param] of Object.entries(skill.parameters)) {
          inputSchema.properties[paramName] = {
            type: param.type || "string",
            description: param.description,
          };
          if (param.required) {
            inputSchema.required.push(paramName);
          }
        }
      }

      // Add a default "context" parameter for passing additional context
      inputSchema.properties.context = {
        type: "string",
        description: "Optional additional context to include with the skill",
      };

      tools.push({
        name: `skill_${name}`,
        description: skill.description,
        inputSchema,
      });
    }

    // Add a meta tool for listing available skills
    tools.push({
      name: "list_skills",
      description: "List all available skills and their descriptions",
      inputSchema: {
        type: "object",
        properties: {},
      },
    });

    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Handle list_skills meta tool
    if (name === "list_skills") {
      const skillList = Array.from(skills.entries()).map(([name, skill]) => ({
        name,
        description: skill.description,
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(skillList, null, 2),
          },
        ],
      };
    }

    // Handle skill tools
    if (name.startsWith("skill_")) {
      const skillName = name.replace("skill_", "");
      const skill = skills.get(skillName);

      if (!skill) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Skill "${skillName}" not found`,
            },
          ],
          isError: true,
        };
      }

      // Build the response with the skill content
      let response = skill.content;

      // If context was provided, append it
      if (args && typeof args === "object" && "context" in args && args.context) {
        response += `\n\n---\nAdditional Context:\n${args.context}`;
      }

      // Replace any parameter placeholders
      if (args && typeof args === "object") {
        for (const [key, value] of Object.entries(args)) {
          if (key !== "context" && typeof value === "string") {
            response = response.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Error: Unknown tool "${name}"`,
        },
      ],
      isError: true,
    };
  });

  // Handle list prompts request
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    const prompts = Array.from(skills.entries()).map(([name, skill]) => ({
      name,
      description: skill.description,
    }));

    return { prompts };
  });

  // Handle get prompt request
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name } = request.params;
    const skill = skills.get(name);

    if (!skill) {
      throw new Error(`Prompt "${name}" not found`);
    }

    return {
      description: skill.description,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: skill.content,
          },
        },
      ],
    };
  });

  // Start the server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Skills Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
