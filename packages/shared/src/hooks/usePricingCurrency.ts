import { useEffect, useState } from 'react'

// ── Currency detection ────────────────────────────────────────────────────────

export interface CurrencyInfo {
  code: string
  rate: number
  country: string
  locale: string
}

export const USD: CurrencyInfo = { code: 'USD', rate: 1, country: '', locale: 'en-US' }
export const SESSION_KEY = 'aios_pricing_currency'

export const LOCALE_MAP: Record<string, string> = {
  USD: 'en-US', EUR: 'en-DE', GBP: 'en-GB', INR: 'en-IN', JPY: 'ja-JP',
  CAD: 'en-CA', AUD: 'en-AU', CHF: 'de-CH', CNY: 'zh-CN', BRL: 'pt-BR',
  MXN: 'es-MX', SGD: 'en-SG', HKD: 'zh-HK', KRW: 'ko-KR', SEK: 'sv-SE',
  NOK: 'nb-NO', DKK: 'da-DK', PLN: 'pl-PL', AED: 'ar-AE', SAR: 'ar-SA',
  ZAR: 'en-ZA', NGN: 'en-NG', PKR: 'ur-PK', BDT: 'bn-BD', IDR: 'id-ID',
  MYR: 'ms-MY', PHP: 'fil-PH', THB: 'th-TH', VND: 'vi-VN', TRY: 'tr-TR',
  ILS: 'he-IL', CLP: 'es-CL', COP: 'es-CO', PEN: 'es-PE', ARS: 'es-AR',
}

export function usePricingCurrency() {
  const [currency, setCurrency] = useState<CurrencyInfo>(USD)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Serve from cache if fresh (1 hour TTL)
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (raw) {
        const { ts, data } = JSON.parse(raw)
        if (Date.now() - ts < 3_600_000) {
          setCurrency(data)
          setLoading(false)
          return
        }
      }
    } catch { /* ignore */ }

    let cancelled = false

    async function detect() {
      try {
        // Step 1 — country + currency code from IP
        const geoRes = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(5000),
        })
        if (!geoRes.ok) throw new Error('geo')
        const geo = await geoRes.json()
        const code = (geo.currency as string)?.toUpperCase()
        const country = (geo.country_name as string) ?? ''

        if (!code || code === 'USD') return

        // Step 2 — exchange rate (USD → local)
        const rateRes = await fetch('https://open.er-api.com/v6/latest/USD', {
          signal: AbortSignal.timeout(5000),
        })
        if (!rateRes.ok) throw new Error('rate')
        const rateData = await rateRes.json()
        const rate: number | undefined = rateData.rates?.[code]

        if (!cancelled && rate) {
          const info: CurrencyInfo = { code, rate, country, locale: LOCALE_MAP[code] ?? 'en-US' }
          setCurrency(info)
          try {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now(), data: info }))
          } catch { /* quota */ }
        }
      } catch { /* fall through to USD */ } finally {
        if (!cancelled) setLoading(false)
      }
    }

    detect()
    return () => { cancelled = true }
  }, [])

  function format(usdAmount: number): string {
    const localAmount = usdAmount === 0 ? 0 : usdAmount * currency.rate
    const noDecimals = localAmount >= 10 || ['JPY', 'KRW', 'VND', 'IDR', 'CLP'].includes(currency.code)
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      maximumFractionDigits: noDecimals ? 0 : 2,
    }).format(localAmount)
  }

  return { currency, loading, format }
}
