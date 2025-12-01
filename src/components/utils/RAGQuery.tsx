/**
 * RAG Query Component
 * 
 * User-facing component for asking questions and getting AI-generated
 * responses based on PrayerMap's knowledge base.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, X, ExternalLink, Sparkles } from 'lucide-react';
import { useRAG } from '../../hooks/useRAG';
import { formatRelativeTime } from '../../lib/utils';

interface RAGQueryProps {
  onClose?: () => void;
  initialQuery?: string;
  namespace?: string;
  model?: 'gpt-4o' | 'gpt-4-turbo' | 'gpt-4' | 'gpt-3.5-turbo';
}

export function RAGQuery({
  onClose,
  initialQuery = '',
  namespace,
  model = 'gpt-4o', // Upgraded to GPT-4o for superior reasoning
}: RAGQueryProps) {
  const [inputQuery, setInputQuery] = useState(initialQuery);
  const {
    query,
    response,
    citations,
    sources,
    isLoading,
    error,
    metadata,
    ask,
    clear,
    retry,
    hasResponse,
    hasCitations,
    canAsk,
  } = useRAG({
    namespace,
    model,
    includeCitations: true,
  });

  // Auto-ask if initial query provided
  useEffect(() => {
    if (initialQuery && !query) {
      ask(initialQuery);
      setInputQuery(initialQuery);
    }
  }, [initialQuery, query, ask]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQuery.trim() && canAsk) {
      ask(inputQuery);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/30 max-w-3xl w-full mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Ask PrayerMap AI</h3>
            <p className="text-sm text-gray-600">
              Get answers from project history and documentation
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Query Input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a question about PrayerMap..."
            className="flex-1 px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-gray-800 placeholder-gray-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Ask</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
          >
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={retry}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Response */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center py-12"
          >
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500 mb-3" />
              <p className="text-gray-600">Searching knowledge base...</p>
            </div>
          </motion.div>
        )}

        {hasResponse && !isLoading && (
          <motion.div
            key="response"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Response Content */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/30">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {response}
                </div>
              </div>
            </div>

            {/* Citations */}
            {hasCitations && (
              <div className="bg-purple-50/50 backdrop-blur-sm rounded-xl p-4 border border-purple-200/30">
                <h4 className="text-sm font-semibold text-purple-800 mb-3">
                  Sources ({citations.length})
                </h4>
                <div className="space-y-2">
                  {citations.map((citation, index) => (
                    <motion.div
                      key={citation.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                              [{index + 1}]
                            </span>
                            <span className="text-xs font-medium text-gray-700">
                              {citation.source}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {citation.content}
                          </p>
                          {citation.metadata.timestamp && (
                            <p className="text-xs text-gray-500 mt-1">
                              {formatRelativeTime(new Date(citation.metadata.timestamp))}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // Navigate to source (if implemented)
                            console.log('View source:', citation);
                          }}
                          className="p-1 hover:bg-white/50 rounded transition-colors"
                          title="View source"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {metadata && (
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <span>Model: {metadata.model}</span>
                  <span>Tokens: {metadata.tokensUsed.toLocaleString()}</span>
                  <span>Sources: {metadata.contextChunks}</span>
                </div>
                <span>{metadata.latency}ms</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={clear}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors"
              >
                Clear
              </button>
              <button
                onClick={retry}
                className="px-4 py-2 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
              >
                Regenerate
              </button>
            </div>
          </motion.div>
        )}

        {!hasResponse && !isLoading && query && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12 text-gray-500"
          >
            <p>No response yet. Ask a question above.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Example Questions */}
      {!query && !hasResponse && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Example questions:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'How do I implement push notifications?',
              'Why did we choose Supabase?',
              'How does the inbox system work?',
              'What are the mobile deployment steps?',
            ].map((example) => (
              <button
                key={example}
                onClick={() => {
                  setInputQuery(example);
                  ask(example);
                }}
                className="px-3 py-1.5 text-xs bg-white/60 hover:bg-white/80 rounded-lg border border-white/30 text-gray-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

