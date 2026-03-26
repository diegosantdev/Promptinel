'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface WatchlistEntry {
  id: string;
  prompt: string;
  provider: string;
  model: string;
  threshold: number;
  baselineId?: string;
  tags?: string[];
  description?: string;
}

interface Snapshot {
  id: string;
  promptId: string;
  timestamp: number;
  driftScore?: number;
}

export default function Home() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [snapshots, setSnapshots] = useState<Record<string, Snapshot[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {

        const watchlistRes = await fetch('/api/watchlist');
        const watchlistData = await watchlistRes.json();
        setWatchlist(watchlistData);


        const snapshotsData: Record<string, Snapshot[]> = {};
        for (const entry of watchlistData) {
          const snapshotsRes = await fetch(`/api/snapshots/${entry.id}`);
          const promptSnapshots = await snapshotsRes.json();
          snapshotsData[entry.id] = promptSnapshots;
        }
        setSnapshots(snapshotsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const getDriftStatus = (promptId: string, threshold: number) => {
    const promptSnapshots = snapshots[promptId] || [];
    if (promptSnapshots.length === 0) return { 
      status: 'no-data', 
      color: 'bg-slate-400',
      label: '',
      icon: '○'
    };

    const latestSnapshot = promptSnapshots[0];
    if (latestSnapshot.driftScore === undefined) {
      return { 
        status: 'no-baseline', 
        color: 'bg-slate-400',
        label: '',
        icon: '○'
      };
    }

    if (latestSnapshot.driftScore > threshold) {
      return { 
        status: 'drift', 
        color: 'bg-red-500',
        label: 'Drifted',
        icon: '⚠'
      };
    }

    return { 
      status: 'ok', 
      color: 'bg-emerald-500',
      label: 'Stable',
      icon: '✓'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-600 font-medium">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center mb-6">
              <img src="/icn2.png" alt="Promptinel" className="w-20 h-20" />
            </div>
            <h1 className="text-4xl font-bold text-black mb-4">
              Welcome to Promptinel
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Monitor your LLM prompts for behavioral drift and ensure consistent AI responses over time.
            </p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-md p-8">
            <h2 className="text-xl font-semibold text-black mb-4">Get Started</h2>
            <p className="text-gray-600 mb-6">
              Add your first prompt to start monitoring:
            </p>
            <div className="bg-black text-white p-6 rounded-md font-mono text-sm text-left">
              <span className="text-gray-400">$</span> promptinel add
            </div>
            <div className="mt-6 text-sm text-gray-500">
              Then run <code className="px-2 py-1 bg-gray-100 rounded-md text-black">promptinel check &lt;prompt-id&gt;</code> to create your first snapshot
            </div>
          </div>
        </div>
      </div>
    );
  }


  const hasMockProvider = watchlist.some(entry => entry.provider === 'mock');

  return (
    <div className="min-h-screen bg-white">

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/assets/icon.png" alt="Promptinel" className="w-14 h-14" />
              <div>
                <h1 className="text-3xl font-bold text-black">
                  Promptinel
                </h1>
                <p className="text-gray-600 mt-1">Monitor and track LLM prompt behavior</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-black">{watchlist.length}</div>
                <div className="text-sm text-gray-500">Prompts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {hasMockProvider && (
          <div className="mb-8 bg-gray-50 border border-gray-300 rounded-md p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-black mb-2">Test Mode Active</h3>
                <p className="text-gray-700 mb-3 leading-relaxed">
                  You're currently using <strong>simulated responses</strong> for testing. These are deterministic mock outputs, not real LLM responses.
                </p>
                <div className="bg-white rounded-md p-4 border border-gray-200">
                  <p className="text-sm font-medium text-black mb-2">To use real LLM providers:</p>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    <li>Install Ollama locally and run <code className="px-1.5 py-0.5 bg-gray-100 rounded-md text-black">ollama serve</code></li>
                    <li>Configure OpenAI, Anthropic, or Mistral API keys in your environment</li>
                    <li>Update your prompts to use a real provider instead of "mock"</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}


        <div className="grid gap-4">
          {watchlist.map((entry) => {
            const driftStatus = getDriftStatus(entry.id, entry.threshold);
            const promptSnapshots = snapshots[entry.id] || [];
            const snapshotCount = promptSnapshots.length;
            const latestDrift = promptSnapshots[0]?.driftScore;

            return (
              <Link
                key={entry.id}
                href={`/prompt/${entry.id}`}
                className="block group"
              >
                <div className="bg-white border border-gray-200 hover:border-black transition-colors p-5 rounded-md">
                  <div className="flex items-start justify-between gap-6">

                    <div className="flex-1 min-w-0">

                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${driftStatus.color}`}></div>
                        <h2 className="text-lg font-semibold text-black group-hover:underline">
                          {entry.id}
                        </h2>
                        {driftStatus.label && (
                          <span className="text-xs text-gray-500">
                            {driftStatus.label}
                          </span>
                        )}
                        {entry.provider === 'mock' && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs border border-gray-300 rounded-md">
                            Test
                          </span>
                        )}
                      </div>

                      <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
                        {entry.prompt}
                      </p>

                      {entry.description && (
                        <p className="text-xs text-gray-500 mb-3 italic">
                          {entry.description}
                        </p>
                      )}


                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {entry.tags.map((tag, index) => (
                            <span
                              key={`${entry.id}-tag-${index}`}
                              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs border border-gray-200 rounded-md"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}


                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        <span>{entry.provider} / {entry.model}</span>
                        <span>•</span>
                        <span>{snapshotCount} snapshots</span>
                        <span>•</span>
                        <span>Threshold: {(entry.threshold * 100).toFixed(0)}%</span>
                      </div>
                    </div>


                    <div className="flex-shrink-0 text-right">
                      {latestDrift !== undefined ? (
                        <div className="bg-gray-50 border border-gray-200 px-4 py-3 min-w-[100px] rounded-md">
                          <div className="text-2xl font-bold text-black">
                            {(latestDrift * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            drift
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 px-4 py-3 min-w-[100px] rounded-md">
                          <div className="text-xl text-gray-400">—</div>
                          <div className="text-xs text-gray-400">
                            no baseline
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
