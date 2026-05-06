'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera, CameraOff, Loader2, RefreshCw, AlertTriangle,
  Zap, Activity,
} from 'lucide-react'
import { api, type FrameResult, type FaceResult } from '@/lib/api'
import { EMOTION_META } from './EmotionBreakdown'

/* ── Config ─────────────────────────────────────────────────────────────── */

const CAPTURE_INTERVAL_MS = 600   // how often to send a frame to the backend
const HISTORY_MAX         = 40    // how many data points to keep in the mood graph

/* ── Types ──────────────────────────────────────────────────────────────── */

interface HistoryPoint {
  ts:      number
  emotion: string
  color:   string
  scores:  Record<string, number>
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function fmt(n: number) { return n.toFixed(1) }

/* ── Component ───────────────────────────────────────────────────────────── */

export default function RealtimeCamera() {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const [running,    setRunning]    = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [camError,   setCamError]   = useState('')
  const [frameRes,   setFrameRes]   = useState<FrameResult | null>(null)
  const [history,    setHistory]    = useState<HistoryPoint[]>([])
  const [fps,        setFps]        = useState(0)
  const [frameCount, setFrameCount] = useState(0)
  const fpsCounterRef = useRef({ count: 0, last: Date.now() })

  /* ── Camera start / stop ─────────────────────────────────────────────── */

  const startCamera = useCallback(async () => {
    setCamError(''); setLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setRunning(true)
    } catch (err: any) {
      setCamError(err.message?.includes('Permission')
        ? 'Camera permission denied. Please allow access in your browser settings.'
        : `Camera error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (timerRef.current)  clearInterval(timerRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (videoRef.current)  videoRef.current.srcObject = null
    streamRef.current = null
    timerRef.current  = null
    setRunning(false)
    setFrameRes(null)
    setHistory([])
    setFps(0)
    setFrameCount(0)
  }, [])

  /* ── Capture + send frame ────────────────────────────────────────────── */

  const captureAndAnalyse = useCallback(async () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.75)

    try {
      const result = await api.analyzeFrame(dataUrl)
      setFrameRes(result)
      setFrameCount(c => c + 1)

      // FPS counter
      const now = Date.now()
      fpsCounterRef.current.count++
      if (now - fpsCounterRef.current.last >= 1000) {
        setFps(fpsCounterRef.current.count)
        fpsCounterRef.current = { count: 0, last: now }
      }

      // History
      setHistory(prev => {
        const point: HistoryPoint = {
          ts:      now,
          emotion: result.overall.dominant_emotion,
          color:   result.overall.color,
          scores:  result.overall.emotions as Record<string, number>,
        }
        return [...prev.slice(-(HISTORY_MAX - 1)), point]
      })
    } catch {
      /* silently ignore frame errors — network blips, etc. */
    }
  }, [])

  /* ── Start / stop async loop when running changes ───────────────────── */

  useEffect(() => {
    let cancelled = false

    async function loop() {
      while (!cancelled && running) {
        const start = Date.now()
        try {
          await captureAndAnalyse()
        } catch (e) {
          // swallow — captureAndAnalyse already handles network/errors
        }
        const elapsed = Date.now() - start
        const wait = Math.max(0, CAPTURE_INTERVAL_MS - elapsed)
        await new Promise(res => setTimeout(res, wait))
      }
    }

    if (running) loop()
    return () => { cancelled = true }
  }, [running, captureAndAnalyse])

  /* ── Cleanup on unmount ──────────────────────────────────────────────── */

  useEffect(() => () => stopCamera(), [stopCamera])

  /* ── Derived values ──────────────────────────────────────────────────── */

  const dominantEmotion = frameRes?.overall.dominant_emotion ?? 'neutral'
  const dominantColor   = frameRes?.overall.color ?? '#808080'
  const dominantIcon    = frameRes?.overall.icon  ?? ''
  const scores          = (frameRes?.overall.emotions ?? {}) as Record<string, number>
  const sortedScores    = Object.entries(scores).sort(([, a], [, b]) => b - a)

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* ── Camera + overlay container ─────────────────────────────────── */}
      <div className="relative overflow-hidden card video-wrap p-0"
        style={{ aspectRatio: '4/3', maxHeight: '520px' }}>

        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video element */}
        <video ref={videoRef} muted playsInline
          className={`w-full h-full object-contain transition-opacity duration-500 ${running ? 'opacity-100' : 'opacity-0'}`}
          style={{ transform: 'scaleX(-1)' }} /* mirror */ />

        {/* ── Idle / loading / error state overlay ── */}
        <AnimatePresence>
          {!running && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-charcoal">
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 size={32} className="animate-spin text-gold" />
                  <p className="text-zinc-400 text-sm font-mono">Requesting camera access…</p>
                </div>
              ) : camError ? (
                <div className="flex flex-col items-center gap-4 max-w-xs text-center px-6">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <AlertTriangle size={24} className="text-red-400" />
                  </div>
                  <p className="text-red-400 text-sm">{camError}</p>
                  <button onClick={startCamera} className="btn-ghost flex items-center gap-2 text-sm">
                    <RefreshCw size={13} /> Try Again
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5">
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                    <Camera size={28} className="text-gold" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-white text-sm font-medium mb-1">Live Emotion Detection</p>
                    <p className="text-zinc-600 text-xs max-w-[220px]">
                      Your webcam feed is analysed in real-time. Nothing is recorded or stored.
                    </p>
                  </div>
                  <button onClick={startCamera} className="btn-primary flex items-center gap-2">
                    <Camera size={15} /> Start Camera
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Face bounding boxes (overlaid on video) ── */}
        {running && frameRes && frameRes.face_count > 0 && (
          <FaceOverlay faces={frameRes.faces} videoEl={videoRef.current} />
        )}

        {/* ── Live HUD (top-left) ── */}
        {running && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
            {/* LIVE badge */}
            <div className="flex items-center gap-1.5 hud-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-white font-mono uppercase tracking-widest">Live</span>
            </div>
            {/* FPS */}
            <div className="flex items-center gap-1.5 hud-badge">
              <Activity size={12} className="text-white" />
              <span className="text-[12px] font-mono">{fps} fps</span>
            </div>
            {/* Frame count */}
            <div className="hud-badge">
              <span className="text-[12px] font-mono text-muted">{frameCount} frames</span>
            </div>
          </motion.div>
        )}

        {/* ── Dominant emotion badge (bottom-left) ── */}
        {running && frameRes && (
          <motion.div
            key={dominantEmotion}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-3 left-3 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm rounded-xl px-3 py-2 border"
              style={{ borderColor: `${dominantColor}40` }}>
              <span className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: dominantColor }} />
              <div>
                <p className="text-white text-sm font-display capitalize">{dominantEmotion}</p>
                <p className="text-zinc-400 text-[10px] font-mono">
                  {frameRes.face_count} face{frameRes.face_count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Stop button (top-right) ── */}
        {running && (
          <button onClick={stopCamera}
            className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10
              flex items-center justify-center text-zinc-400 hover:text-red-400 hover:border-red-400/30 transition-all">
            <CameraOff size={15} />
          </button>
        )}
      </div>

      {/* ── Live scores ──────────────────────────────────────────────────── */}
      {running && frameRes && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="card p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Live Emotion Scores</p>
            <div className="flex items-center gap-1.5">
              <Zap size={9} className="text-gold" />
              <span className="text-[10px] font-mono text-zinc-600">
                {(1000 / CAPTURE_INTERVAL_MS).toFixed(1)} req/s
              </span>
            </div>
          </div>

                {sortedScores.map(([emo, val]) => {
            const meta = EMOTION_META[emo] ?? { color: '#808080', label: emo }
            return (
              <div key={emo} className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                <span className="text-[11px] text-zinc-500 w-14 font-mono capitalize flex-shrink-0">{meta.label}</span>
                <div className="flex-1 h-2 bg-mist rounded-full overflow-hidden">
                  {/* Animate width every render — no key change needed, framer handles it */}
                  <motion.div className="h-full rounded-full"
                    style={{ backgroundColor: meta.color }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 0.35, ease: 'easeOut' }} />
                </div>
                <span className="text-[11px] font-mono w-10 text-right flex-shrink-0"
                  style={{ color: emo === dominantEmotion ? meta.color : '#52525b' }}>
                  {fmt(val)}%
                </span>
              </div>
            )
          })}
        </motion.div>
      )}

      {/* ── Mood history graph ────────────────────────────────────────────── */}
      {history.length > 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-5">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">
            Mood History ({history.length} frames)
          </p>
          <MoodGraph history={history} />
        </motion.div>
      )}
    </div>
  )
}

/* ── Face Overlay ─────────────────────────────────────────────────────────── */

function FaceOverlay({ faces, videoEl }: { faces: FaceResult[]; videoEl: HTMLVideoElement | null }) {
  if (!videoEl) return null

  // Map analyzer (server) coordinates to displayed element coordinates.
  // The backend resizes frames to 320px width when the source is larger,
  // so face.region is reported in that resized coordinate space. We compute
  // the analyzer source size and then convert region coords to percentages
  // relative to the displayed video element (which uses `object-contain`).
  const vW = videoEl.videoWidth  || 640
  const vH = videoEl.videoHeight || 480
  const elW = videoEl.clientWidth || 640
  const elH = videoEl.clientHeight || 480

  const analyzerWidth = Math.min(vW, 320)
  const analyzerHeight = Math.round((analyzerWidth / vW) * vH) || vH

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ transform: 'scaleX(-1)' }}>
      {faces.map(face => {
        const r = face.region
        if (!r || !r.w || !r.h) return null

        // Convert analyzer-space coords -> percentages for the displayed element
        const left   = ((r.x ?? 0) / analyzerWidth) * 100
        const top    = ((r.y ?? 0) / analyzerHeight) * 100
        const width  = ((r.w ?? 0) / analyzerWidth) * 100
        const height = ((r.h ?? 0) / analyzerHeight) * 100

        return (
          <motion.div key={face.face_index}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute"
            style={{
              left: `${left}%`, top: `${top}%`,
              width: `${width}%`, height: `${height}%`,
              border: `2px solid ${face.color}`,
              borderRadius: '4px',
              boxShadow: `0 0 12px ${face.color}40`,
            }}>
            {/* Label — un-flip so text reads correctly */}
            <div className="absolute -top-7 left-0 whitespace-nowrap" style={{ transform: 'scaleX(-1)' }}>
              <div className="flex items-center gap-2 rounded-md px-2 py-0.5 text-[11px] font-mono text-white"
                style={{ backgroundColor: `${face.color}CC` }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: face.color }} />
                <span className="capitalize">{face.dominant_emotion}</span>
                <span className="opacity-70">{face.confidence?.toFixed(0) ?? face.emotions[face.dominant_emotion]?.toFixed(0)}%</span>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ── Mood History Graph ───────────────────────────────────────────────────── */

function MoodGraph({ history }: { history: HistoryPoint[] }) {
  const emotions = ['happy', 'sad', 'angry', 'fear', 'surprise', 'disgust', 'neutral']
  const W = 100   // percentage
  const H = 80    // px
  const n = history.length

  return (
    <div className="space-y-3">
      {emotions.map(emo => {
        const meta   = EMOTION_META[emo]
        const values = history.map(h => h.scores[emo] ?? 0)
        if (values.every(v => v < 2)) return null   // skip flat-zero lines

        // Build SVG polyline points
        const pts = values.map((v, i) => {
          const x = (i / (n - 1)) * W
          const y = H - (v / 100) * H
          return `${x.toFixed(1)},${y.toFixed(1)}`
        }).join(' ')

        const latest = values[values.length - 1]

        return (
          <div key={emo} className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-500 w-14 font-mono capitalize flex-shrink-0">{meta.label}</span>
            <div className="flex-1 relative overflow-hidden rounded" style={{ height: '28px' }}>
              <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none"
                className="w-full h-full" style={{ display: 'block' }}>
                {/* Area fill */}
                <defs>
                  <linearGradient id={`grad-${emo}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={meta.color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={meta.color} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {n > 1 && (
                  <>
                    <polyline points={`${pts} ${W},${H} 0,${H}`}
                      fill={`url(#grad-${emo})`} stroke="none" />
                    <polyline points={pts}
                      fill="none" stroke={meta.color} strokeWidth="1.5"
                      strokeLinejoin="round" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </div>
            <span className="text-[11px] font-mono w-10 text-right flex-shrink-0"
              style={{ color: meta.color }}>
              {latest.toFixed(0)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}