import { NextResponse } from 'next/server'

export async function GET() {
  const totalCapital = process.env.TOTAL_CAPITAL || "1000"
  return NextResponse.json({ totalCapital })
} 