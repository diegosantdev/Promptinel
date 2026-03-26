import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SAFE_SEGMENT_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

function isSafeSegment(segment: string): boolean {
  return (
    typeof segment === 'string' &&
    segment.length > 0 &&
    !segment.includes('/') &&
    !segment.includes('\\') &&
    !segment.includes('..') &&
    !path.isAbsolute(segment) &&
    SAFE_SEGMENT_RE.test(segment)
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ snapshotId: string }> }
) {
  try {
    const { snapshotId } = await params;

    if (!isSafeSegment(snapshotId)) {
      return NextResponse.json({ error: 'Invalid snapshot ID' }, { status: 400 });
    }
    

    const snapshotsDir = path.join(process.cwd(), '..', '.promptinel', 'snapshots');
    
    try {
      const promptDirs = await fs.readdir(snapshotsDir);
      
      for (const promptId of promptDirs) {
        if (!isSafeSegment(promptId)) continue;

        const promptDir = path.join(snapshotsDir, promptId);
        const stat = await fs.stat(promptDir);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(promptDir);
          
          for (const file of files) {
            if (file.includes(snapshotId)) {
              const snapshotPath = path.join(promptDir, file);
              const data = await fs.readFile(snapshotPath, 'utf-8');
              const snapshot = JSON.parse(data);
              return NextResponse.json(snapshot);
            }
          }
        }
      }
      
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    } catch (error) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error reading snapshot:', error);
    return NextResponse.json({ error: 'Failed to read snapshot' }, { status: 500 });
  }
}

