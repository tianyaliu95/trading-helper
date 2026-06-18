import { NextResponse } from 'next/server'

const SYMBOL_MAP: Record<string, { coingecko: string; okx: string; cryptocompare: string }> = {
  BTCUSDT: { coingecko: 'bitcoin', okx: 'BTC-USDT', cryptocompare: 'BTC' },
  ETHUSDT: { coingecko: 'ethereum', okx: 'ETH-USDT', cryptocompare: 'ETH' },
}

async function fetchBinance(baseUrl: string, symbol: string): Promise<string | null> {
  const response = await fetch(`${baseUrl}/api/v3/ticker/price?symbol=${symbol}`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) return null

  const data = await response.json()
  return data.price ?? null
}

async function fetchOkx(symbol: string): Promise<string | null> {
  const instId = SYMBOL_MAP[symbol]?.okx
  if (!instId) return null

  const response = await fetch(
    `https://www.okx.com/api/v5/market/ticker?instId=${instId}`,
    { headers: { Accept: 'application/json' } }
  )

  if (!response.ok) return null

  const data = await response.json()
  return data.data?.[0]?.last ?? null
}

async function fetchCoinGecko(symbol: string): Promise<string | null> {
  const id = SYMBOL_MAP[symbol]?.coingecko
  if (!id) return null

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
    { headers: { Accept: 'application/json' } }
  )

  if (!response.ok) return null

  const data = await response.json()
  return data[id]?.usd?.toString() ?? null
}

async function fetchCryptoCompare(symbol: string): Promise<string | null> {
  const apiKey = process.env.CRYPTOCOMPARE_API_KEY
  if (!apiKey) return null

  const cryptoSymbol = SYMBOL_MAP[symbol]?.cryptocompare
  if (!cryptoSymbol) return null

  const response = await fetch(
    `https://min-api.cryptocompare.com/data/price?fsym=${cryptoSymbol}&tsyms=USD&api_key=${apiKey}`,
    { headers: { Accept: 'application/json' } }
  )

  if (!response.ok) return null

  const data = await response.json()
  return data.USD?.toString() ?? null
}

const PRICE_PROVIDERS: { name: string; fetch: (symbol: string) => Promise<string | null> }[] = [
  { name: 'Binance', fetch: (symbol) => fetchBinance('https://api1.binance.com', symbol) },
  { name: 'Binance US', fetch: (symbol) => fetchBinance('https://api.binance.us', symbol) },
  { name: 'OKX', fetch: fetchOkx },
  { name: 'CoinGecko', fetch: fetchCoinGecko },
  { name: 'CryptoCompare', fetch: fetchCryptoCompare },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
  }

  if (!SYMBOL_MAP[symbol]) {
    return NextResponse.json({ error: 'Unsupported symbol' }, { status: 400 })
  }

  const errors: string[] = []

  for (const provider of PRICE_PROVIDERS) {
    try {
      console.log(`Trying ${provider.name} for ${symbol}...`)
      const price = await provider.fetch(symbol)

      if (price) {
        console.log(`Successfully got price from ${provider.name}: ${price}`)
        return NextResponse.json({ price })
      }

      errors.push(`${provider.name}: no price in response`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error'
      console.log(`${provider.name} failed:`, message)
      errors.push(`${provider.name}: ${message}`)
    }
  }

  return NextResponse.json(
    { error: `All price sources failed. ${errors.join('; ')}` },
    { status: 502 }
  )
}
