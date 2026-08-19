import type { Tekening } from './tekenbord/types'

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

async function upload<T>(path: string, file: File, fieldName: string): Promise<T> {
  const form = new FormData()
  form.append(fieldName, file)
  const response = await fetch(`${BASE_URL}${path}`, { method: 'POST', credentials: 'include', body: form })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const fieldErrors = (body?.errors ?? []).map((e: { field: string; message: string }) => ({
      field: e.field,
      message: e.message,
    }))
    throw new ApiError(response.status, fieldErrors[0]?.message ?? body?.message ?? response.statusText, fieldErrors)
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
  fotoPath: string | null
  rapporten?: Rapport[]
}

export type SpelerInput = Partial<Omit<Speler, 'id' | 'rapporten' | 'fotoPath'>>

export function spelerFotoUrl(speler: Pick<Speler, 'id' | 'fotoPath'>): string | null {
  return speler.fotoPath ? `${BASE_URL}/spelers/${speler.id}/foto?v=${encodeURIComponent(speler.fotoPath)}` : null
}

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
  opstellingrijen?: Opstellingrij[]
}

export type WedstrijdInput = Partial<
  Omit<Wedstrijd, 'id' | 'motmSpeler' | 'doelpunten' | 'kaarten' | 'opstellingrijen'>
>

export type Opstellingrij = {
  id: number
  wedstrijdId: number
  spelerId: number
  positieId: string
  positieLabel: string
  spelStatus: 'basis' | 'wissel' | 'afwezig'
  minuten: number
  speler?: Speler
}

export type OpstellingrijInput = {
  spelerId: number
  positieId: string
  positieLabel: string
  spelStatus?: 'basis' | 'wissel' | 'afwezig'
  minuten?: number
}

export type OpstellingrijUpdateInput = {
  spelStatus?: 'basis' | 'wissel' | 'afwezig'
  minuten?: number
}

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

export type Standrij = {
  id: number
  naam: string
  gespeeld: number
  winst: number
  gelijk: number
  verlies: number
  doelVoor: number
  doelTegen: number
}

export type StandrijInput = Partial<Omit<Standrij, 'id'>>

export type Formatie = {
  id: number
  naam: string
  formatie: string
  toewijzing: Record<string, number>
}

export type FormatieInput = Partial<Omit<Formatie, 'id'>>

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
  tekening: Tekening | null
}

export type OnderdeelInput = Partial<Omit<Onderdeel, 'id' | 'trainingId'>>

export type Tactiek = {
  id: number
  naam: string
  veldType: string
  tekening: Tekening | null
}

export type TactiekInput = Partial<Omit<Tactiek, 'id'>>

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
    uploadFoto: (id: number, file: File) => upload<Speler>(`/spelers/${id}/foto`, file, 'foto'),
    removeFoto: (id: number) => request<void>(`/spelers/${id}/foto`, { method: 'DELETE' }),
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

  opstellingrijen: {
    create: (wedstrijdId: number, data: OpstellingrijInput) =>
      request<Opstellingrij>(`/wedstrijden/${wedstrijdId}/opstellingrijen`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: OpstellingrijUpdateInput) =>
      request<Opstellingrij>(`/opstellingrijen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/opstellingrijen/${id}`, { method: 'DELETE' }),
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

  standrijen: {
    list: () => request<Standrij[]>('/standrijen'),
    create: (data: StandrijInput) =>
      request<Standrij>('/standrijen', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: StandrijInput) =>
      request<Standrij>(`/standrijen/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/standrijen/${id}`, { method: 'DELETE' }),
  },

  formaties: {
    list: () => request<Formatie[]>('/formaties'),
    create: (data: FormatieInput) =>
      request<Formatie>('/formaties', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: FormatieInput) =>
      request<Formatie>(`/formaties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/formaties/${id}`, { method: 'DELETE' }),
  },

  tactieken: {
    list: () => request<Tactiek[]>('/tactieken'),
    get: (id: number) => request<Tactiek>(`/tactieken/${id}`),
    create: (data: TactiekInput) => request<Tactiek>('/tactieken', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: TactiekInput) => request<Tactiek>(`/tactieken/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/tactieken/${id}`, { method: 'DELETE' }),
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
