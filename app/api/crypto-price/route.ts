import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  // Map Binance symbols to CoinGecko IDs
  const symbolToId: { [key: string]: string } = {
    'BTCUSDT': 'bitcoin',
    'ETHUSDT': 'ethereum'
  };

  const coinId = symbolToId[symbol];
  if (!coinId) {
    return NextResponse.json({ error: 'Unsupported symbol' }, { status: 400 });
  }

  try {
    console.log(`Fetching price for ${coinId}`);
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CoinGecko API error: ${response.status}`, errorText);
      return NextResponse.json(
        { error: `CoinGecko API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Received data:', data);
    
    if (!data[coinId]?.usd) {
      console.error('No price in response:', data);
      return NextResponse.json(
        { error: 'Invalid response from CoinGecko API' },
        { status: 500 }
      );
    }

    return NextResponse.json({ price: data[coinId].usd.toString() });
  } catch (error) {
    console.error('Error fetching crypto price:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch price' },
      { status: 500 }
    );
  }
} 