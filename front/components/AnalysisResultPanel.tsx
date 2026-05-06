'use client'

import { motion } from 'framer-motion'
import { ImageIcon, Film, Users, Info, X } from 'lucide-react'
import type { AnalysisResult, ImageResult, VideoResult } from '@/lib/api'
import { EmotionBreakdown } from './EmotionBreakdown'
import VideoTimeline from './VideoTimeline'

interface Props {
  result:  AnalysisResult
  file:    File
  onClose: () => void
}

export default function AnalysisResultPanel({ result, file, onClose }: Props) {
  const isImg = result.type === 'image'

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      transition={{ duration: .45 }} className="card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${result.overall.color}14`, border: `1px solid ${result.overall.color}28` }}>
            {isImg
              ? <ImageIcon size={15} style={{ color: result.overall.color }} />
              : <Film      size={15} style={{ color: result.overall.color }} />}
          </div>
          <div>
            <p className="text-white text-sm font-medium truncate max-w-[200px]">
              {result.filename ?? (isImg ? 'Image Analysis' : 'Video Analysis')}
            </p>
            <p className="text-zinc-600 text-[11px] font-mono">
              {isImg ? 'Image' : 'Video'} · {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button onClick={onClose}
          className="text-zinc-600 hover:text-white transition-colors p-1.5 hover:bg-mist rounded-lg">
          <X size={15} />
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-xl px-4 py-3 border flex items-start gap-3"
        style={{ backgroundColor: `${result.overall.color}0C`, borderColor: `${result.overall.color}22` }}>
        <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: result.overall.color }} />
        <p className="text-zinc-300 text-xs leading-relaxed">{result.summary}</p>
      </div>

      {isImg
        ? <ImageContent result={result as ImageResult} file={file} />
        : <VideoContent result={result as VideoResult} />}
    </motion.div>
  )
}

/* ── Image ──────────────────────────────────────────────────────────────── */

function ImageContent({ result, file }: { result: ImageResult; file: File }) {
  const url = file ? URL.createObjectURL(file) : null
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        {url && (
          <div className="w-24 h-24 rounded-xl overflow-hidden border border-border flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="analysed" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Users size={11} className="text-zinc-600" />
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
              {result.face_count} face{result.face_count !== 1 ? 's' : ''} detected
            </span>
          </div>
          <EmotionBreakdown
            emotions={result.overall.emotions} dominant={result.overall.dominant_emotion}
            color={result.overall.color} icon={result.overall.icon} title="Overall" />
        </div>
      </div>

      {result.face_count > 1 && (
        <div>
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Per-Face</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {result.faces.map(face => (
              <motion.div key={face.face_index}
                initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: face.face_index * .08 }}
                className="bg-slate/50 rounded-xl p-4 border border-border/60">
                <p className="text-[10px] font-mono text-zinc-600 mb-3 uppercase tracking-widest">
                  Face #{face.face_index + 1}
                </p>
                <EmotionBreakdown
                  emotions={face.emotions} dominant={face.dominant_emotion}
                  color={face.color} icon={face.icon} compact />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Video ──────────────────────────────────────────────────────────────── */

function VideoContent({ result }: { result: VideoResult }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Duration', value: result.duration_formatted },
          { label: 'Segments', value: String(result.segment_count) },
          { label: 'FPS',      value: result.fps.toFixed(0) },
        ].map(s => (
          <div key={s.label} className="bg-slate/50 rounded-xl p-3 border border-border/60 text-center">
            <p className="font-display text-xl text-white">{s.value}</p>
            <p className="text-[10px] font-mono text-zinc-600 mt-0.5 uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      <EmotionBreakdown
        emotions={result.overall.emotions} dominant={result.overall.dominant_emotion}
        color={result.overall.color} icon={result.overall.icon}
        title="Overall Emotion Distribution" />

      <VideoTimeline
        segments={result.segments}
        totalDuration={result.duration_seconds}
        durationFormatted={result.duration_formatted} />
    </div>
  )
}