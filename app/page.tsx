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
    totalCapital: "",
    risk: "1",
    leverage: "5",
  })

  const [selectedCrypto, setSelectedCrypto] = useState("ETHUSDT")
  const [result, setResult] = useState({
    positionSize: 0,
    margin: 0,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTotalCapitalModified, setIsTotalCapitalModified] = useState(false)
  const [notification, setNotification] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // 获取总资金
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
        if (data.risk && !isTotalCapitalModified) {
          setFormData(prev => ({
            ...prev,
            risk: data.risk
          }))
        }
      } catch (error) {
        console.error('Error fetching total capital:', error)
      }
    }

    fetchTotalCapital()
  }, [isTotalCapitalModified])

  // 获取实时市价
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
          console.log('Updating entry price:', selectedCrypto, Number(Number(data.price).toFixed(2)))
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
    let interval: NodeJS.Timeout | null = null

    if (!isPaused) {
      interval = setInterval(fetchCryptoPrice, 10000) // 10 seconds
    }

    // clean-up func of the useEffect, 当[selectedCrypto, isPaused] 变化时，会执行这个函数
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [selectedCrypto, isPaused])

  useEffect(() => {
    // const handleKeyDown = (e: KeyboardEvent) => {
    //   if (e.key === 'Enter') {
    //     calculate();
    //   }
    // };

    // document.addEventListener('keydown', handleKeyDown);
    // return () => document.removeEventListener('keydown', handleKeyDown);

    if (formData.entryPrice && formData.stopLoss && formData.totalCapital && formData.risk && formData.leverage) {
      calculate()
    }
  }, [formData]);

  // input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'totalCapital') {
      setIsTotalCapitalModified(true)
    }
    // 任何输入变化都恢复价格更新
    if (isPaused) {
      setIsPaused(false)
    }
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // 交易对
  const handleCryptoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // 交易对变化也恢复价格更新
    if (isPaused) {
      setIsPaused(false)
    }
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

  // 复制保证金
  const handleCopyMargin = async () => {
    try {
      await navigator.clipboard.writeText(result.margin.toString())
      setNotification(true)
      setIsCopied(true)
      setTimeout(() => setNotification(false), 3000)
      setTimeout(() => setIsCopied(false), 2000) // 复制图标状态持续2秒
      console.log('Copied margin:', selectedCrypto, result.margin)
    } catch (e) {
      console.log('Error copying margin:', e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-200 p-2 flex flex-col items-center justify-center">
      {/* Notification Banner */}
      {notification && (
        <div className="fixed top-0 left-0 w-full z-50 flex justify-center">
          <div className="mt-4 px-6 py-2 rounded bg-green-100 text-green-800 shadow text-base animate-fade-in-out">
            保证金已复制到剪贴板
          </div>
        </div>
      )}

      <div className="w-full max-w-lg rounded-xl">
        <div className="bg-white rounded-xl shadow-xl px-10 py-12">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-base font-medium text-gray-700 w-20">总资金</label>
              <input
                type="text"
                inputMode="decimal"
                name="totalCapital"
                value={formData.totalCapital}
                onChange={handleInputChange}
                className="w-[200px] text-center sm:w-[280] ml-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none transition-all duration-200"
                placeholder="1000"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-base font-medium text-gray-700 w-20">杠杆</label>
              <div className="flex items-center w-[200px] sm:w-[280px] ml-2 bg-white rounded-lg border border-gray-300">
                <button
                  type="button"
                  className="w-10 h-10 text-xl text-gray-500 hover:cursor-pointer hover:text-gray-700 focus:outline-none"
                  onClick={() => {
                    if (isPaused) setIsPaused(false)
                    setFormData((prev) => ({
                      ...prev,
                      leverage: String(Math.max(1, Number(prev.leverage) - 1)),
                    }))
                  }}
                  disabled={Number(formData.leverage) <= 1}
                >-</button>
                <span className="flex-1 text-center text-lg text-gray-700 select-none">{formData.leverage}</span>
                <button
                  type="button"
                  className="w-10 h-10 text-xl text-gray-500 hover:cursor-pointer hover:text-gray-700 focus:outline-none"
                  onClick={() => {
                    if (isPaused) setIsPaused(false)
                    setFormData((prev) => ({
                      ...prev,
                      leverage: String(Math.min(100, Number(prev.leverage) + 1)),
                    }))
                  }}
                  disabled={Number(formData.leverage) >= 100}
                >+</button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-base font-medium text-gray-700 w-20">风险 (%)</label>
              <div className="flex items-center w-[200px] sm:w-[280px] ml-2 bg-white rounded-lg border border-gray-300">
                <button
                  type="button"
                  className="w-10 h-10 text-xl text-gray-500 hover:cursor-pointer hover:text-gray-700 focus:outline-none"
                  onClick={() => {
                    if (isPaused) setIsPaused(false)
                    setFormData((prev) => ({
                      ...prev,
                      risk: String(Math.max(1, Number(prev.risk) - 1)),
                    }))
                  }}
                  disabled={Number(formData.risk) <= 1}
                >-</button>
                <span className="flex-1 text-center text-lg text-gray-700 select-none">{formData.risk}</span>
                <button
                  type="button"
                  className="w-10 h-10 text-xl text-gray-500 hover:cursor-pointer hover:text-gray-700 focus:outline-none"
                  onClick={() => {
                    if (isPaused) setIsPaused(false)
                    setFormData((prev) => ({
                      ...prev,
                      risk: String(Math.min(100, Number(prev.risk) + 1)),
                    }))
                  }}
                  disabled={Number(formData.risk) >= 100}
                >+</button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-base font-medium text-gray-700 w-20">交易对</label>
              <div className="relative w-[200px] sm:w-[280px] ml-2">
                <select
                  value={selectedCrypto}
                  onChange={handleCryptoChange}
                  className={`
                    w-full px-3 py-1.5
                    rounded-lg border border-gray-300
                    bg-white text-gray-900
                    text-center
                    transition-all duration-200
                    appearance-none
                    hover:cursor-pointer
                    focus:outline-none
                  `}
                  style={{ textAlignLast: 'center' }}
                >
                  {CRYPTO_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {/* Custom arrow */}
                <div className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 flex flex-col items-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 8L2 4h8L6 8z" fill="#222" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-base font-medium text-gray-700 w-20">入场价</label>
              <input
                type="text"
                inputMode="decimal"
                name="entryPrice"
                value={formData.entryPrice}
                onChange={handleInputChange}
                className="w-[200px] text-center sm:w-[280px] px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none transition-all duration-200"
                placeholder={error || "正在获取价格..."}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-base font-medium text-gray-700 w-20">止损价</label>
              <input
                type="text"
                inputMode="decimal"
                name="stopLoss"
                value={formData.stopLoss}
                onChange={handleInputChange}
                className="w-[200px] text-center sm:w-[280] ml-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none transition-all duration-200"
                placeholder="请输入止损价"
              />
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={calculate}
                className="flex-1 bg-green-700 text-white hover:cursor-pointer font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                计算
              </button>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`w-12 h-10 border rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none flex items-center justify-center hover:cursor-pointer ${isPaused
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-orange-100 text-orange-800 border border-orange-200'
                  }`}
                title={isPaused ? "继续价格更新" : "暂停价格更新"}
              >
                {isPaused ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                )}
              </button>
            </div>

            {/* 价格更新状态提示 */}
            <div className={`mt-4 px-4 py-2 rounded-lg text-center text-sm transition-all duration-200 ${isPaused
              ? 'bg-orange-100 text-orange-800 border border-orange-200'
              : 'bg-green-100 text-green-800 border border-green-200'
              }`}>
              {isPaused ? (
                <div className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                  <span>价格更新已暂停</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                  <span>价格实时更新中 (每10秒)</span>
                </div>
              )}
            </div>

            {result.positionSize > 0 && (
              <div className="mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-700 text-white p-3 rounded-lg p-4">
                    <p className="text-base mb-1">仓位数量</p>
                    <p className="text-lg font-bold">{result.positionSize}</p>
                  </div>
                  <div
                    className="bg-green-700 text-white p-3 rounded-lg p-4 relative cursor-pointer hover:cursor-pointer transition-all duration-200 transform hover:scale-[1.02]"
                    onClick={handleCopyMargin}
                    title="点击复制保证金"
                  >
                    <p className="text-base mb-1">保证金</p>
                    <p className="text-lg font-bold">{result.margin}</p>
                    {/* 复制图标 */}
                    <div className="absolute top-3 right-3">
                      {isCopied ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                        </svg>
                      )}
                    </div>
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
