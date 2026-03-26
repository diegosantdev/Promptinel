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
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const { promptId } = await params;

    if (!isSafeSegment(promptId)) {
      return NextResponse.json({ error: 'Invalid prompt ID' }, { status: 400 });
    }

    const snapshotsDir = path.join(process.cwd(), '..', '.promptinel', 'snapshots', promptId);
    
    try {
      const files = await fs.readdir(snapshotsDir);
      const snapshots = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(snapshotsDir, file);
          const data = await fs.readFile(filePath, 'utf-8');
          try {
            const snapshot = JSON.parse(data);
            snapshots.push(snapshot);
          } catch (parseError) {
            console.warn(`Skipping corrupted file: ${file}`);
          }
        }
      }


      snapshots.sort((a, b) => b.timestamp - a.timestamp);

      return NextResponse.json(snapshots);
    } catch (error) {

      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error reading snapshots:', error);
    return NextResponse.json({ error: 'Failed to read snapshots' }, { status: 500 });
  }
}

