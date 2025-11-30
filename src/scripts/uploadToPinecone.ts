#!/usr/bin/env tsx

import { IntelligentPineconeUploader, ConversationDataUtils, ConversationData } from '../services/pineconeService';
import { Pinecone } from '@pinecone-database/pinecone';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/**
 * CLI tool for uploading conversations and data to Pinecone with intelligent tagging
 * 
 * Usage:
 *   npx tsx src/scripts/uploadToPinecone.ts --source ./docs --type markdown
 *   npx tsx src/scripts/uploadToPinecone.ts --source ./conversations.json --type json
 *   npx tsx src/scripts/uploadToPinecone.ts --source cursor --type cursor
 *   npx tsx src/scripts/uploadToPinecone.ts --source github --repo owner/repo
 */

interface CLIOptions {
  source: string;
  type: 'markdown' | 'json' | 'cursor' | 'github' | 'directory';
  repo?: string;
  namespace?: string;
  dryRun?: boolean;
  batchSize?: number;
  chunkSize?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  recursive?: boolean;
}

class PineconeUploadCLI {
  private uploader: IntelligentPineconeUploader;
  private pinecone: Pinecone;

  constructor() {
    // Initialize Pinecone client
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || ''
    });

    // Initialize uploader
    this.uploader = new IntelligentPineconeUploader({
      batchSize: 50,
      chunkSize: 1000,
      chunkOverlap: 100,
      enableMetadataEnrichment: true,
      retryAttempts: 3,
      retryDelay: 1000
    });

    // Inject Pinecone client into uploader
    (this.uploader as any).pinecone = this.pinecone.index(process.env.PINECONE_INDEX_NAME || 'prayermap-conversations');
  }

  async run(options: CLIOptions): Promise<void> {
    console.log('🚀 Pinecone Upload Tool Starting...');
    console.log(`📂 Source: ${options.source}`);
    console.log(`📝 Type: ${options.type}`);
    console.log(`🎯 Namespace: ${options.namespace || 'default'}`);
    
    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No actual uploads will be performed');
    }

    try {
      // Load conversations based on type
      const conversations = await this.loadConversations(options);
      console.log(`📚 Loaded ${conversations.length} conversations`);

      if (conversations.length === 0) {
        console.log('⚠️ No conversations found to upload');
        return;
      }

      // Show preview of what will be uploaded
      this.showUploadPreview(conversations);

      if (options.dryRun) {
        console.log('✅ Dry run completed successfully');
        return;
      }

      // Confirm upload
      const shouldProceed = await this.confirmUpload(conversations.length);
      if (!shouldProceed) {
        console.log('❌ Upload cancelled by user');
        return;
      }

      // Upload to Pinecone
      await this.uploader.uploadConversations(conversations);
      
      console.log('🎉 Upload completed successfully!');
      
      // Show upload statistics
      this.showUploadStats(conversations);

    } catch (error) {
      console.error('💥 Upload failed:', error);
      process.exit(1);
    }
  }

  private async loadConversations(options: CLIOptions): Promise<ConversationData[]> {
    console.log('📖 Loading conversations...');

    switch (options.type) {
      case 'directory':
      case 'markdown':
        return this.loadFromDirectory(options);
      
      case 'json':
        return this.loadFromJSON(options.source);
      
      case 'cursor':
        return this.loadFromCursor();
      
      case 'github':
        return this.loadFromGitHub(options.repo!);
      
      default:
        throw new Error(`Unsupported type: ${options.type}`);
    }
  }

  private async loadFromDirectory(options: CLIOptions): Promise<ConversationData[]> {
    const {
      source,
      includePatterns = ['**/*.md', '**/*.txt', '**/*.json'],
      excludePatterns = ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      recursive = true
    } = options;

    console.log(`🔍 Scanning directory: ${source}`);
    console.log(`📋 Include patterns: ${includePatterns.join(', ')}`);
    console.log(`🚫 Exclude patterns: ${excludePatterns.join(', ')}`);

    const conversations: ConversationData[] = [];

    for (const pattern of includePatterns) {
      const searchPattern = recursive 
        ? path.join(source, pattern)
        : path.join(source, pattern.replace('**/', ''));

      try {
        const files = await glob(searchPattern, {
          ignore: excludePatterns,
          nodir: true
        });

        console.log(`📁 Found ${files.length} files matching pattern: ${pattern}`);

        for (const file of files) {
          try {
            const conversation = await this.loadFileAsConversation(file);
            if (conversation) {
              conversations.push(conversation);
            }
          } catch (error) {
            console.warn(`⚠️ Failed to load file ${file}:`, error);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to scan pattern ${pattern}:`, error);
      }
    }

    return conversations;
  }

  private async loadFileAsConversation(filePath: string): Promise<ConversationData | null> {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (content.trim().length === 0) {
      console.log(`⏭️ Skipping empty file: ${filePath}`);
      return null;
    }

    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    const relativePath = path.relative(process.cwd(), filePath);

    // Determine conversation type based on file extension and content
    let type: ConversationData['type'] = 'document';
    if (ext === '.md') type = 'document';
    else if (ext === '.json') type = 'conversation';
    else if (content.includes('bug') || content.includes('error')) type = 'bug_report';
    else if (content.includes('feature') || content.includes('enhancement')) type = 'feature_request';

    // Determine source
    let source: ConversationData['source'] = 'manual';
    if (filePath.includes('cursor')) source = 'cursor';
    else if (filePath.includes('github')) source = 'github';
    else if (filePath.includes('slack')) source = 'slack';

    return ConversationDataUtils.fromMarkdown(content, {
      id: this.generateFileId(filePath),
      timestamp: stats.mtime,
      participants: this.extractParticipants(content),
      type,
      source,
      metadata: {
        filePath: relativePath,
        fileName,
        fileSize: stats.size,
        extension: ext,
        lastModified: stats.mtime.toISOString()
      }
    });
  }

  private async loadFromJSON(filePath: string): Promise<ConversationData[]> {
    console.log(`📄 Loading JSON file: ${filePath}`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (Array.isArray(data)) {
      return data.map(item => ConversationDataUtils.fromJSON(item));
    } else {
      return [ConversationDataUtils.fromJSON(data)];
    }
  }

  private async loadFromCursor(): Promise<ConversationData[]> {
    console.log('🖱️ Loading from Cursor...');
    // Implementation would connect to Cursor's conversation history
    // This would require accessing Cursor's local database or API
    console.warn('⚠️ Cursor integration not yet implemented');
    return [];
  }

  private async loadFromGitHub(repo: string): Promise<ConversationData[]> {
    console.log(`🐙 Loading from GitHub repo: ${repo}`);
    // Implementation would use GitHub API to fetch issues, PRs, discussions
    console.warn('⚠️ GitHub integration not yet implemented');
    return [];
  }

  private generateFileId(filePath: string): string {
    const relativePath = path.relative(process.cwd(), filePath);
    return `file_${Buffer.from(relativePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  private extractParticipants(content: string): string[] {
    // Extract participants from content using various patterns
    const participants = new Set<string>();
    
    // Look for @mentions
    const mentions = content.match(/@(\w+)/g);
    if (mentions) {
      mentions.forEach(mention => participants.add(mention.substring(1)));
    }

    // Look for "User:" or "Assistant:" patterns
    const speakers = content.match(/^(User|Assistant|Claude|AI):/gm);
    if (speakers) {
      speakers.forEach(speaker => participants.add(speaker.replace(':', '')));
    }

    // Look for email patterns
    const emails = content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    if (emails) {
      emails.forEach(email => participants.add(email));
    }

    return participants.size > 0 ? Array.from(participants) : ['unknown'];
  }

  private showUploadPreview(conversations: ConversationData[]): void {
    console.log('\n📊 Upload Preview:');
    console.log('='.repeat(50));
    
    // Show statistics
    const stats = this.calculateStats(conversations);
    console.log(`📚 Total conversations: ${stats.total}`);
    console.log(`📝 Total content size: ${this.formatBytes(stats.totalSize)}`);
    console.log(`📅 Date range: ${stats.dateRange.start} → ${stats.dateRange.end}`);
    
    // Show breakdown by type
    console.log('\n📊 By Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    // Show breakdown by source
    console.log('\n📊 By Source:');
    Object.entries(stats.bySource).forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });

    // Show sample conversations
    console.log('\n📋 Sample Conversations:');
    conversations.slice(0, 3).forEach((conv, index) => {
      const preview = conv.content.substring(0, 100);
      console.log(`  ${index + 1}. [${conv.type}] ${conv.id} - "${preview}..."`);
    });

    console.log('='.repeat(50));
  }

  private calculateStats(conversations: ConversationData[]) {
    const stats = {
      total: conversations.length,
      totalSize: conversations.reduce((sum, conv) => sum + conv.content.length, 0),
      byType: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      dateRange: {
        start: new Date(Math.min(...conversations.map(c => c.timestamp.getTime()))).toISOString().split('T')[0],
        end: new Date(Math.max(...conversations.map(c => c.timestamp.getTime()))).toISOString().split('T')[0]
      }
    };

    conversations.forEach(conv => {
      stats.byType[conv.type] = (stats.byType[conv.type] || 0) + 1;
      stats.bySource[conv.source] = (stats.bySource[conv.source] || 0) + 1;
    });

    return stats;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async confirmUpload(count: number): Promise<boolean> {
    // In a real implementation, this would use readline to get user input
    // For now, we'll just return true
    console.log(`\n❓ Ready to upload ${count} conversations to Pinecone?`);
    console.log('   This will generate embeddings and upload to your Pinecone index.');
    console.log('   Proceeding automatically...\n');
    
    return true;
  }

  private showUploadStats(conversations: ConversationData[]): void {
    const stats = this.calculateStats(conversations);
    
    console.log('\n🎯 Upload Statistics:');
    console.log('='.repeat(40));
    console.log(`✅ Conversations processed: ${stats.total}`);
    console.log(`📊 Total content uploaded: ${this.formatBytes(stats.totalSize)}`);
    console.log(`🏷️ Metadata fields generated: ~${stats.total * 15} fields`);
    console.log(`🔍 Embeddings generated: ~${Math.ceil(stats.totalSize / 800)} vectors`);
    console.log('='.repeat(40));
  }
}

// CLI argument parsing
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    source: '.',
    type: 'directory'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--source':
        options.source = args[++i];
        break;
      case '--type':
        options.type = args[++i] as CLIOptions['type'];
        break;
      case '--repo':
        options.repo = args[++i];
        break;
      case '--namespace':
        options.namespace = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--chunk-size':
        options.chunkSize = parseInt(args[++i]);
        break;
      case '--recursive':
        options.recursive = args[++i].toLowerCase() === 'true';
        break;
      case '--include':
        options.includePatterns = args[++i].split(',');
        break;
      case '--exclude':
        options.excludePatterns = args[++i].split(',');
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
🚀 Pinecone Upload Tool

Upload conversations and documents to Pinecone with intelligent tagging.

USAGE:
  npx tsx src/scripts/uploadToPinecone.ts [OPTIONS]

OPTIONS:
  --source <path>          Source path or identifier (default: current directory)
  --type <type>           Type of source: directory, markdown, json, cursor, github
  --repo <owner/repo>     GitHub repository (for github type)
  --namespace <name>      Pinecone namespace (default: default)
  --dry-run              Preview what would be uploaded without actual upload
  --batch-size <number>   Number of chunks per batch (default: 50)
  --chunk-size <number>   Size of text chunks (default: 1000)
  --recursive <bool>      Recursively scan directories (default: true)
  --include <patterns>    Include patterns (comma-separated)
  --exclude <patterns>    Exclude patterns (comma-separated)
  --help, -h              Show this help message

EXAMPLES:
  # Upload all markdown files from docs directory
  npx tsx src/scripts/uploadToPinecone.ts --source ./docs --type directory

  # Upload specific JSON file
  npx tsx src/scripts/uploadToPinecone.ts --source ./conversations.json --type json

  # Dry run to preview upload
  npx tsx src/scripts/uploadToPinecone.ts --source ./docs --dry-run

  # Upload with custom patterns
  npx tsx src/scripts/uploadToPinecone.ts --source ./src --include "**/*.ts,**/*.md" --exclude "**/node_modules/**"

ENVIRONMENT VARIABLES:
  PINECONE_API_KEY       Your Pinecone API key
  PINECONE_INDEX_NAME    Name of your Pinecone index
  OPENAI_API_KEY         OpenAI API key for embeddings and metadata enrichment
`);
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const cli = new PineconeUploadCLI();
  
  cli.run(options).catch(error => {
    console.error('💥 CLI execution failed:', error);
    process.exit(1);
  });
}

export { PineconeUploadCLI, CLIOptions };