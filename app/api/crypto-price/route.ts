import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    console.log(`Fetching price for symbol: ${symbol}`);
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Binance API error: ${response.status}`, errorText);
      return NextResponse.json(
        { error: `Binance API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Received data:', data);
    
    if (!data.price) {
      console.error('No price in response:', data);
      return NextResponse.json(
        { error: 'Invalid response from Binance API' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch price' },
      { status: 500 }
    );
  }
} 