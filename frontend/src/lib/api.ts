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

export type WedstrijdScore = { fch?: number; teg?: number }

export type Doelpunt = {
  id: number
  wedstrijdId: number
  scorerSpelerId: number
  assistSpelerId: number | null
  minuut: number | null
  scorerSpeler?: Speler
  assistSpeler?: Speler | null
}

export type DoelpuntInput = {
  scorerSpelerId: number
  assistSpelerId?: number
  minuut?: number
}

export type Kaart = {
  id: number
  wedstrijdId: number
  spelerId: number
  type: 'geel' | 'rood'
  minuut: number | null
  speler?: Speler
}

export type KaartInput = {
  spelerId: number
  type: 'geel' | 'rood'
  minuut?: number
}

export type Wedstrijd = {
  id: number
  tegenstander: string
  datum: string
  tijd: string | null
  locatie: string | null
  thuis: boolean
  status: 'gepland' | 'gespeeld'
  score: WedstrijdScore | null
  motmSpelerId: number | null
  motmSpeler?: Speler | null
  formatie: string | null
  speelduur: number | null
  notities: string | null
  doelpunten?: Doelpunt[]
  kaarten?: Kaart[]
}

export type WedstrijdInput = Partial<Omit<Wedstrijd, 'id' | 'motmSpeler' | 'doelpunten' | 'kaarten'>>

export type Liveevent = {
  id: number
  wedstrijdId: number
  type: string
  minuut: number | null
  spelerId: number | null
  speler?: Speler | null
  createdAt: string
}

export type LiveeventInput = {
  type: string
  minuut?: number
  spelerId?: number
}

export type Activiteit = {
  id: number
  titel: string
  soort: string | null
  datum: string
  locatie: string | null
  heleDag: boolean
  tijd: string | null
  eindtijd: string | null
  herhaal: 'nee' | 'wekelijks' | 'tweewekelijks' | 'maandelijks' | null
  herhaalTot: string | null
  notitie: string | null
}

export type ActiviteitInput = Partial<Omit<Activiteit, 'id'>>

export type Onderdeel = {
  id: number
  trainingId: number
  naam: string
  type: string | null
  doel: string | null
  duur: number | null
  aantalSpelers: number | null
  veldGrootte: string | null
  materialen: string | null
  beschrijving: string | null
  aandachtspunten: string | null
}

export type OnderdeelInput = Partial<Omit<Onderdeel, 'id' | 'trainingId'>>

export type Aanwezigheid = {
  id: number
  trainingId: number
  spelerId: number
  status: 'aanwezig' | 'afwezig' | 'geblesseerd'
  speler?: Speler
}

export type Training = {
  id: number
  seizoenblokId: number | null
  datum: string
  tijd: string | null
  locatie: string | null
  duur: number
  doelstellingen: string | null
  voorbereidingen: string | null
  materialen: string | null
  notities: string | null
  onderdelen?: Onderdeel[]
  aanwezigheden?: Aanwezigheid[]
}

export type TrainingInput = Partial<Omit<Training, 'id' | 'seizoenblokId' | 'onderdelen' | 'aanwezigheden'>>

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

  wedstrijden: {
    list: () => request<Wedstrijd[]>('/wedstrijden'),
    get: (id: number) => request<Wedstrijd>(`/wedstrijden/${id}`),
    create: (data: WedstrijdInput) =>
      request<Wedstrijd>('/wedstrijden', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: WedstrijdInput) =>
      request<Wedstrijd>(`/wedstrijden/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/wedstrijden/${id}`, { method: 'DELETE' }),
  },

  doelpunten: {
    create: (wedstrijdId: number, data: DoelpuntInput) =>
      request<Doelpunt>(`/wedstrijden/${wedstrijdId}/doelpunten`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    remove: (id: number) => request<void>(`/doelpunten/${id}`, { method: 'DELETE' }),
  },

  kaarten: {
    create: (wedstrijdId: number, data: KaartInput) =>
      request<Kaart>(`/wedstrijden/${wedstrijdId}/kaarten`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    remove: (id: number) => request<void>(`/kaarten/${id}`, { method: 'DELETE' }),
  },

  liveevents: {
    list: (wedstrijdId: number) => request<Liveevent[]>(`/wedstrijden/${wedstrijdId}/liveevents`),
    create: (wedstrijdId: number, data: LiveeventInput) =>
      request<Liveevent>(`/wedstrijden/${wedstrijdId}/liveevents`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    remove: (id: number) => request<void>(`/liveevents/${id}`, { method: 'DELETE' }),
  },

  activiteiten: {
    list: () => request<Activiteit[]>('/activiteiten'),
    create: (data: ActiviteitInput) =>
      request<Activiteit>('/activiteiten', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: ActiviteitInput) =>
      request<Activiteit>(`/activiteiten/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/activiteiten/${id}`, { method: 'DELETE' }),
  },

  trainingen: {
    list: () => request<Training[]>('/trainingen'),
    get: (id: number) => request<Training>(`/trainingen/${id}`),
    create: (data: TrainingInput) =>
      request<Training>('/trainingen', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: TrainingInput) =>
      request<Training>(`/trainingen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/trainingen/${id}`, { method: 'DELETE' }),
  },

  onderdelen: {
    create: (trainingId: number, data: OnderdeelInput) =>
      request<Onderdeel>(`/trainingen/${trainingId}/onderdelen`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: OnderdeelInput) =>
      request<Onderdeel>(`/onderdelen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/onderdelen/${id}`, { method: 'DELETE' }),
  },

  aanwezigheden: {
    update: (id: number, status: Aanwezigheid['status']) =>
      request<Aanwezigheid>(`/aanwezigheden/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
  },
}
