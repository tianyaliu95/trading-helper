"use client"
import { useState, useEffect } from "react"

const CRYPTO_OPTIONS = [
  { value: "BTCUSDT", label: "BTC/USDT" },
  { value: "ETHUSDT", label: "ETH/USDT" },
]

export default function Home() {
  const [formData, setFormData] = useState({
    entryPrice: "",
    stopLoss: "",
    totalCapital: "1000",
    risk: "1",
    leverage: "5",
  })

  const [selectedCrypto, setSelectedCrypto] = useState("BTCUSDT")
  const [result, setResult] = useState({
    positionSize: 0,
    margin: 0,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTotalCapitalModified, setIsTotalCapitalModified] = useState(false)

  useEffect(() => {
    const fetchTotalCapital = async () => {
      try {
        const response = await fetch('/api/total-capital')
        const data = await response.json()
        if (data.totalCapital && !isTotalCapitalModified) {
          setFormData(prev => ({
            ...prev,
            totalCapital: data.totalCapital
          }))
        }
      } catch (error) {
        console.error('Error fetching total capital:', error)
      }
    }

    fetchTotalCapital()
  }, [isTotalCapitalModified])

  useEffect(() => {
    const fetchCryptoPrice = async () => {
      try {
        setError(null)
        const response = await fetch(`/api/crypto-price?symbol=${selectedCrypto}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`)
        }

        if (data.error) {
          throw new Error(data.error)
        }

        if (data.price) {
          setFormData(prev => ({
            ...prev,
            entryPrice: Number(data.price).toFixed(2)
          }))
          setIsLoading(false)
        } else {
          throw new Error('No price data received')
        }
      } catch (error) {
        console.error('Error fetching crypto price:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch price')
        setIsLoading(false)
      }
    }

    fetchCryptoPrice()
    const interval = setInterval(fetchCryptoPrice, 10000) // 10 seconds

    return () => clearInterval(interval)
  }, [selectedCrypto])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'totalCapital') {
      setIsTotalCapitalModified(true)
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCryptoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCrypto(e.target.value)
    setIsLoading(true)
  }

  const calculate = () => {
    const {
      entryPrice,
      stopLoss,
      totalCapital,
      risk,
      leverage,
    } = formData

    const positionSize =
      (Number(totalCapital) * (Number(risk) / 100)) /
      (Math.abs(Number(entryPrice) - Number(stopLoss)))

    const margin = (positionSize * Number(entryPrice)) / Number(leverage)

    setResult({
      positionSize: Number(positionSize.toFixed(6)),
      margin: Number(margin.toFixed(2)),
    })
  }

  return (
    <div className="min-h-screen bg-gray-200 p-2 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 w-20">总资金</label>
              <input
                type="number"
                name="totalCapital"
                value={formData.totalCapital}
                onChange={handleInputChange}
                className="flex-1 ml-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="1000"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 w-20">杠杆</label>
              <input
                type="number"
                name="leverage"
                value={formData.leverage}
                onChange={handleInputChange}
                className="flex-1 ml-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="5"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 w-20">风险 (%)</label>
              <input
                type="number"
                name="risk"
                value={formData.risk}
                onChange={handleInputChange}
                className="flex-1 ml-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="1"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 w-20">交易对</label>
              <select
                value={selectedCrypto}
                onChange={handleCryptoChange}
                className="flex-1 ml-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                {CRYPTO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="py-2">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 w-20">入场价</label>
              <div className="flex-1 ml-2 relative">
                <input
                  type="number"
                  name="entryPrice"
                  value={formData.entryPrice}
                  onChange={handleInputChange}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder={error || "正在获取价格..."}
                  disabled={isLoading}
                />
                {isLoading && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 w-20">止损价</label>
              <input
                type="number"
                name="stopLoss"
                value={formData.stopLoss}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    calculate()
                  }
                }}
                className="flex-1 ml-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="请输入止损价"
              />
            </div>

            <button
              onClick={calculate}
              className="w-full bg-green-600 hover:cursor-pointer text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              计算
            </button>

            {result.positionSize > 0 && (
              <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-2 rounded">
                    <p className="text-xs text-gray-600">仓位数量</p>
                    <p className="text-lg font-bold text-gray-900">{result.positionSize}</p>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <p className="text-xs text-gray-600">保证金</p>
                    <p className="text-lg font-bold text-gray-900">{result.margin}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
