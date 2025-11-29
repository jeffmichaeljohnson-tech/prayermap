/**
 * Memory System Core for PrayerMap
 * Pinecone-based agent memory architecture
 *
 * @module memory
 */

// Export all types
export * from './types';

// Export Pinecone client
export { pineconeClient } from './pinecone-client';

// Export logging functions
export {
  logTask,
  logDecision,
  logError,
  logResearch,
  logLearning,
  logHandoff,
} from './logger';

// Export query functions
export {
  findSimilar,
  findByDomain,
  findDecisions,
  findErrorSolution,
  findResearch,
  findErrorsInFiles,
  findRecentTasks,
  findPatterns,
  getPreQueryContext,
  findHandoffsToAgent,
  getSessionSummary,
} from './query';

// Export cache functions
export {
  memoryCache,
  getFromCache,
  setInCache,
  getHotCache,
  refreshCache,
  clearCache,
  cleanupCache,
  getCacheStats,
  stopCacheRefresh,
  CacheHelper,
} from './cache';

// Export types that might be commonly used
export type {
  HotCache,
} from './cache';
