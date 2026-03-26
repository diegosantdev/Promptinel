'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LineChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

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

export default function PromptDetail() {
  const params = useParams();
  const router = useRouter();
  const promptId = params.promptId as string;
  
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSnapshots() {
      try {
        const res = await fetch(`/api/snapshots/${promptId}`);
        const data = await res.json();
        setSnapshots(data);
      } catch (error) {
        console.error('Error loading snapshots:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSnapshots();
  }, [promptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          <div className="text-gray-600 font-medium">Loading snapshots...</div>
        </div>
      </div>
    );
  }

  if (snapshots.length === 0) {
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
            Back to Dashboard
          </button>
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-md mb-6">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-black mb-4">{promptId}</h1>
            <div className="bg-white border border-gray-200 p-8">
              <p className="text-gray-600 mb-6">No snapshots yet. Create your first snapshot to start monitoring drift.</p>
              <div className="bg-black text-white p-4 rounded-md font-mono text-sm">
                <span className="text-gray-400">$</span> promptinel check {promptId}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  const chartData = [...snapshots]
    .reverse()
    .filter(s => s.driftScore !== undefined)
    .map(s => ({
      timestamp: new Date(s.timestamp).toLocaleDateString(),
      drift: (s.driftScore! * 100).toFixed(1),
    }));


  const isMockMode = snapshots.some(s => s.provider === 'mock');

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
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3 mb-3">
            <img src="/assets/icon.png" alt="Promptinel" className="w-8 h-8" />
            <h1 className="text-3xl font-bold text-black">
              {promptId}
            </h1>
          </div>
          <p className="text-gray-600 leading-relaxed max-w-4xl">{snapshots[0].prompt}</p>
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
                <p className="text-xs text-gray-600">This prompt uses simulated responses. Configure a real provider for actual LLM monitoring.</p>
              </div>
            </div>
          </div>
        )}


        {chartData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-md p-5 mb-6">
            <h2 className="text-lg font-semibold text-black mb-4">
              Drift Timeline
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#000000" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#000000" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  label={{ value: 'Drift %', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="drift"
                  stroke="none"
                  fill="url(#driftGradient)"
                  fillOpacity={1}
                />
                <Line 
                  type="monotone" 
                  dataKey="drift" 
                  stroke="#000000" 
                  strokeWidth={2}
                  dot={{ fill: '#000000', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}


        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-black flex items-center gap-2">
              Snapshots
              <span className="ml-2 px-2 py-0.5 bg-black text-white text-xs font-semibold rounded-md">
                {snapshots.length}
              </span>
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {snapshots.map((snapshot) => (
              <Link
                key={snapshot.id}
                href={`/snapshot/${snapshot.id}`}
                className="block px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-black font-medium group-hover:underline">
                        {snapshot.id}
                      </span>
                      {snapshot.baselineId && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs border border-gray-300 rounded-md">
                          Baseline
                        </span>
                      )}
                      {snapshot.provider === 'mock' && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs border border-gray-300 rounded-md">
                          Test
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{new Date(snapshot.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span>{snapshot.provider} / {snapshot.model}</span>
                    </div>
                  </div>

                  {snapshot.driftScore !== undefined ? (
                    <div className="text-right bg-gray-50 border border-gray-200 rounded-md px-4 py-3 min-w-[90px]">
                      <div className="text-xl font-bold text-black">
                        {(snapshot.driftScore * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        drift
                      </div>
                    </div>
                  ) : (
                    <div className="text-right bg-gray-50 border border-gray-200 rounded-md px-4 py-3 min-w-[90px]">
                      <div className="text-lg text-gray-400">—</div>
                      <div className="text-xs text-gray-400">
                        no score
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
