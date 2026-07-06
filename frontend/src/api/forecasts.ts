import { api } from './client'

export interface Forecast {
  id: string;
  domain: string;
  metric: string;
  target_date: string;
  predicted_value: number;
  confidence: number;
  ai_insight?: string;
  created_at: string;
}

export const forecastsApi = {
  list: (domain?: string) => api.get<Forecast[]>('/forecasts', { params: { domain } }).then(r => r.data),
  generate: (domain: string) => api.post<Forecast>('/forecasts/generate', { domain }).then(r => r.data),
}
