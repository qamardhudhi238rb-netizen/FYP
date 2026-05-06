import Cookies from 'js-cookie'

const BASE = '/api'

// ── Token helpers ─────────────────────────────────────────────────────────

export const getToken   = (): string | null => Cookies.get('emo_token') ?? null
export const setToken   = (t: string)       => Cookies.set('emo_token', t, { expires: 1, sameSite: 'lax' })
export const clearToken = ()                => Cookies.remove('emo_token')

// ── Core fetch ────────────────────────────────────────────────────────────

async function req<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res  = await fetch(`${BASE}${path}`, { ...init, headers })
  const data = await res.json().catch(() => ({ detail: 'Unknown error' }))
  if (!res.ok) throw new Error((data as { detail: string }).detail || `HTTP ${res.status}`)
  return data as T
}

// ── Auth ──────────────────────────────────────────────────────────────────

export const api = {
  register: (name: string, email: string, password: string) =>
    req<AuthResponse>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    req<AuthResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),

  me: () => req<UserData>('/auth/me'),

  // Analysis — file uploads
  analyzeImage: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return req<ImageResult>('/analyze/image', { method: 'POST', body: fd })
  },

  analyzeVideo: (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return req<VideoResult>('/analyze/video', { method: 'POST', body: fd })
  },

  // Realtime — single base64 frame
  analyzeFrame: (frameDataUrl: string) =>
    req<FrameResult>('/analyze/frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame: frameDataUrl }),
    }),
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface AuthResponse {
  access_token: string
  token_type:   string
  user: UserData
}

export interface UserData {
  id:             string
  name:           string
  email:          string
  analyses_count: number
}

export interface EmotionScores {
  happy?:    number
  sad?:      number
  angry?:    number
  fear?:     number
  surprise?: number
  disgust?:  number
  neutral?:  number
  [key: string]: number | undefined
}

export interface Overall {
  dominant_emotion: string
  emotions:         EmotionScores
  color:            string
  icon:             string
}

export interface FaceResult {
  face_index:        number
  dominant_emotion:  string
  emotions:          EmotionScores
  confidence?:       number
  region:            { x: number; y: number; w: number; h: number }
  color:             string
  icon:              string
}

export interface ImageResult {
  type:       'image'
  filename?:  string
  face_count: number
  faces:      FaceResult[]
  overall:    Overall
  summary:    string
}

export interface VideoSegment {
  emotion:            string
  start_seconds:      number
  end_seconds:        number
  start_formatted:    string
  end_formatted:      string
  duration_seconds:   number
  confidence:         number
  emotion_scores:     EmotionScores
  color:              string
  icon:               string
}

export interface VideoResult {
  type:               'video'
  filename?:          string
  duration_seconds:   number
  duration_formatted: string
  fps:                number
  segments:           VideoSegment[]
  segment_count:      number
  overall:            Overall
  emotional_journey:  Array<{ time: string; emotion: string; icon: string; color: string }>
  summary:            string
}

export interface FrameResult {
  type:       'frame'
  face_count: number
  faces:      FaceResult[]
  overall:    Overall
}

export type AnalysisResult = ImageResult | VideoResult