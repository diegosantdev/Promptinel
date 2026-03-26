import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const watchlistPath = path.join(process.cwd(), '..', '.promptinel', 'watchlist.json');
    
    try {
      const data = await fs.readFile(watchlistPath, 'utf-8');
      const watchlist = JSON.parse(data);
      return NextResponse.json(watchlist);
    } catch (error) {

      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error reading watchlist:', error);
    return NextResponse.json({ error: 'Failed to read watchlist' }, { status: 500 });
  }
}
