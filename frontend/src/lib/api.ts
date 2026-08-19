const BASE_URL = '/api/v1'

export class ApiError extends Error {
  status: number
  fieldErrors: { field: string; message: string }[]

  constructor(status: number, message: string, fieldErrors: { field: string; message: string }[] = []) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const fieldErrors = (body?.errors ?? []).map((e: { field: string; message: string }) => ({
      field: e.field,
      message: e.message,
    }))
    throw new ApiError(response.status, fieldErrors[0]?.message ?? response.statusText, fieldErrors)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export type User = {
  id: number
  fullName: string | null
  email: string
  initials: string
}

export type SpelerStats = {
  doelpunten?: number
  assists?: number
  geelKaarten?: number
  roodKaarten?: number
  speelMinuten?: number
  wedstrijden?: number
}

export type Speler = {
  id: number
  naam: string
  rugnummer: string | null
  positie: string | null
  positie2: string | null
  geboortedatum: string | null
  favorietBeen: string | null
  telefoon: string | null
  email: string | null
  adres: string | null
  land: string | null
  beschikbaar: string
  beschikbaarNotitie: string | null
  skills: Record<string, number>
  sterren: Record<string, number>
  stats: SpelerStats
  rapporten?: Rapport[]
}

export type SpelerInput = Partial<Omit<Speler, 'id' | 'rapporten'>>

export type Rapport = {
  id: number
  spelerId: number
  seizoen: string
  soort: 'begin' | 'tussen' | 'eind'
  tekst: string | null
  positie: string | null
  skills: Record<string, number>
  sterren: Record<string, number>
  ovr: number | null
  createdAt: string
}

export type RapportInput = {
  seizoen: string
  soort: 'begin' | 'tussen' | 'eind'
  tekst?: string
  positie?: string
  skills?: Record<string, number>
  sterren?: Record<string, number>
  ovr?: number
}

export const api = {
  login: (email: string, password: string) =>
    request<{ data: { user: User } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ message: string }>('/account/logout', { method: 'POST' }),

  profile: () => request<{ data: User }>('/account/profile'),

  spelers: {
    list: () => request<Speler[]>('/spelers'),
    get: (id: number) => request<Speler>(`/spelers/${id}`),
    create: (data: SpelerInput) =>
      request<Speler>('/spelers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: SpelerInput) =>
      request<Speler>(`/spelers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/spelers/${id}`, { method: 'DELETE' }),
  },

  rapporten: {
    list: (spelerId: number) => request<Rapport[]>(`/spelers/${spelerId}/rapporten`),
    create: (spelerId: number, data: RapportInput) =>
      request<Rapport>(`/spelers/${spelerId}/rapporten`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: RapportInput) =>
      request<Rapport>(`/rapporten/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/rapporten/${id}`, { method: 'DELETE' }),
  },
}
