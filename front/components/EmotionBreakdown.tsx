"use client"

import React from 'react'
import { motion } from 'framer-motion'

const IconHappy: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" />
    <path d="M8.5 13.5c1 1 2.5 1.5 3.5 1.5s2.5-.5 3.5-1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 10h.01M15 10h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconSad: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 15.5c1-1 2.5-1.5 2.5-1.5s1.5.5 2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 10h.01M15 10h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconAngry: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 9c1-1 3-1 4 0" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 9c-1-1-3-1-4 0" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 15s1.2-1.2 3-1.2 3 1.2 3 1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconFear: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.2 9.2L9.21 9.21" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.8 9.2L14.81 9.21" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 13.5v.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconSurprise: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="13" r="1.3" fill="currentColor" />
    <path d="M9 10h.01M15 10h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconDisgust: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 15c1-1 3-1.5 4-1.5s3 .5 4 1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 10h.01M15 10h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const IconNeutral: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 14h6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 10h.01M15 10h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const EMOTION_META: Record<string, { color: string; label: string; Icon: React.FC<{ className?: string }> }> = {
  happy:    { Icon: IconHappy,    color: '#FFD700', label: 'Happy'    },
  sad:      { Icon: IconSad,      color: '#4169E1', label: 'Sad'      },
  angry:    { Icon: IconAngry,    color: '#DC143C', label: 'Angry'    },
  fear:     { Icon: IconFear,     color: '#800080', label: 'Fear'     },
  surprise: { Icon: IconSurprise, color: '#FF8C00', label: 'Surprise' },
  disgust:  { Icon: IconDisgust,  color: '#228B22', label: 'Disgust'  },
  neutral:  { Icon: IconNeutral,  color: '#808080', label: 'Neutral'  },
}

interface BarProps {
  emotion:  string
  score:    number
  delay?:   number
  dominant?: boolean
}

export function EmotionBar({ emotion, score, delay = 0, dominant = false }: BarProps) {
  const meta = EMOTION_META[emotion] ?? { color: '#808080', label: emotion }
  const IconComp = EMOTION_META[emotion]?.Icon
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: .35 }}
      className={`flex items-center gap-3 py-1 ${dominant ? '' : 'opacity-65'}`}>
      <span className="w-6 h-6 flex items-center justify-center flex-shrink-0" style={{ color: meta.color }}>
        {IconComp ? <IconComp className="w-4 h-4" /> : <span className="w-3 h-3 rounded-full" style={{ backgroundColor: meta.color }} />}
      </span>
      <span className="text-[11px] text-zinc-500 w-14 font-mono capitalize flex-shrink-0">{meta.label}</span>
      <div className="flex-1 h-1.5 bg-mist rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full"
          style={{ backgroundColor: meta.color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: .85, delay: delay + .2, ease: 'easeOut' }} />
      </div>
      <span className="text-[11px] font-mono w-10 text-right flex-shrink-0"
        style={{ color: dominant ? meta.color : '#52525b' }}>
        {score.toFixed(1)}%
      </span>
    </motion.div>
  )
}

interface BreakdownProps {
  emotions:  Record<string, number>
  dominant:  string
  color:     string
  icon:      string
  title?:    string
  compact?:  boolean
}

export function EmotionBreakdown({ emotions, dominant, color, icon, title, compact }: BreakdownProps) {
  const sorted = Object.entries(emotions).sort(([, a], [, b]) => b - a)
  const DominantIcon = EMOTION_META[dominant]?.Icon

  return (
    <div>
      {title && <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">{title}</p>}

      {/* Dominant pill */}
      {!compact && (
        <motion.div initial={{ scale: .93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-3 rounded-xl p-4 mb-4 border"
          style={{ backgroundColor: `${color}10`, borderColor: `${color}22` }}>
          <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color, boxShadow: `0 6px 18px ${color}22`, color }}>
            {DominantIcon ? <DominantIcon className="w-5 h-5" /> : <span className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />}
          </span>
          <div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Dominant</p>
            <p className="text-white font-display text-xl capitalize">{dominant}</p>
          </div>
          <div className="ml-auto text-2xl font-display font-bold" style={{ color }}>
            {emotions[dominant]?.toFixed(0)}%
          </div>
        </motion.div>
      )}

      <div className="space-y-0.5">
        {sorted.map(([emo, val], i) => (
          <EmotionBar key={emo} emotion={emo} score={val} delay={i * .055} dominant={emo === dominant} />
        ))}
      </div>
    </div>
  )
}