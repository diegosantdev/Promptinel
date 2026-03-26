'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Snapshot {
  id: string;
  promptId: string;
  prompt: string;
  output: string;
  provider: string;
  model: string;
  timestamp: number;
  driftScore?: number;
  baselineId?: string;
}

export default function SnapshotDetail() {
  const params = useParams();
  const router = useRouter();
  const snapshotId = params.snapshotId as string;
  
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [baseline, setBaseline] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSnapshot() {
      try {
        const res = await fetch(`/api/snapshot/${snapshotId}`);
        const data = await res.json();
        setSnapshot(data);


        if (data.baselineId) {
          const baselineRes = await fetch(`/api/snapshot/${data.baselineId}`);
          const baselineData = await baselineRes.json();
          setBaseline(baselineData);
        }
      } catch (error) {
        console.error('Error loading snapshot:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSnapshot();
  }, [snapshotId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-600 font-medium">Loading snapshot...</div>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-black hover:underline font-medium transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-md mb-6">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-black mb-4">Snapshot Not Found</h1>
            <p className="text-gray-600">The snapshot you're looking for doesn't exist or has been deleted.</p>
          </div>
        </div>
      </div>
    );
  }

  const isMockMode = snapshot.provider === 'mock';

  return (
    <div className="min-h-screen bg-white">

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-black hover:underline font-medium transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <img src="/assets/icon.png" alt="Promptinel" className="w-8 h-8" />
                <h1 className="text-3xl font-bold text-black">
                  {snapshot.id}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-gray-600">
                  {new Date(snapshot.timestamp).toLocaleString()}
                </span>
                <span className="text-gray-400">•</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs border border-gray-200 rounded-md">{snapshot.provider}</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs border border-gray-200 rounded-md">{snapshot.model}</span>
                {isMockMode && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs border border-gray-300 rounded-md">
                    Test Mode
                  </span>
                )}
              </div>
            </div>

            {snapshot.driftScore !== undefined && (
              <div className="bg-gray-50 border border-gray-200 rounded-md px-6 py-4 text-center">
                <div className="text-3xl font-bold text-black mb-1">
                  {(snapshot.driftScore * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  drift score
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {isMockMode && (
          <div className="mb-6 bg-gray-50 border border-gray-300 rounded-md p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-800 rounded-md flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-black">Test Mode Active</p>
                <p className="text-xs text-gray-600">This snapshot uses a simulated response. Configure a real provider for actual LLM monitoring.</p>
              </div>
            </div>
          </div>
        )}


        <div className="bg-white border border-gray-200 rounded-md p-5 mb-5">
          <h2 className="text-lg font-semibold text-black mb-3">
            Prompt
          </h2>
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-md">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-mono">{snapshot.prompt}</pre>
          </div>
        </div>


        {baseline ? (
          <div className="grid lg:grid-cols-2 gap-5">

            <div className="bg-white border border-gray-200 rounded-md p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-black">
                  Baseline Output
                </h2>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs border border-gray-300 rounded-md">
                  Reference
                </span>
              </div>
              <div className="bg-gray-50 p-4 border border-gray-200 rounded-md mb-3">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-mono">{baseline.output}</pre>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {new Date(baseline.timestamp).toLocaleString()}
              </div>
            </div>


            <div className="bg-white border border-gray-200 rounded-md p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-black">
                  Current Output
                </h2>
                {snapshot.driftScore !== undefined && (
                  <span className={`px-2 py-0.5 text-xs border rounded-md ${
                    snapshot.driftScore > 0.3 
                      ? 'bg-gray-100 text-gray-900 border-gray-400' 
                      : 'bg-gray-100 text-gray-700 border-gray-300'
                  }`}>
                    {snapshot.driftScore > 0.3 ? 'Drifted' : 'Stable'}
                  </span>
                )}
              </div>
              <div className="bg-gray-50 p-4 border border-gray-200 rounded-md mb-3">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-mono">{snapshot.output}</pre>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {new Date(snapshot.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-md p-5">
            <h2 className="text-lg font-semibold text-black mb-3">
              Output
            </h2>
            <div className="bg-gray-50 p-4 border border-gray-200 rounded-md">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-mono">{snapshot.output}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
