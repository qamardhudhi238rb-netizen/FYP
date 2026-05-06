'use client'

import { motion } from 'framer-motion'

export const EMOTION_META: Record<string, { icon: string; color: string; label: string }> = {
  happy:    { icon: '😊', color: '#FFD700', label: 'Happy'    },
  sad:      { icon: '😢', color: '#4169E1', label: 'Sad'      },
  angry:    { icon: '😠', color: '#DC143C', label: 'Angry'    },
  fear:     { icon: '😨', color: '#800080', label: 'Fear'     },
  surprise: { icon: '😲', color: '#FF8C00', label: 'Surprise' },
  disgust:  { icon: '🤢', color: '#228B22', label: 'Disgust'  },
  neutral:  { icon: '😐', color: '#808080', label: 'Neutral'  },
}

interface BarProps {
  emotion:  string
  score:    number
  delay?:   number
  dominant?: boolean
}

export function EmotionBar({ emotion, score, delay = 0, dominant = false }: BarProps) {
  const meta = EMOTION_META[emotion] ?? { icon: '❓', color: '#808080', label: emotion }
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: .35 }}
      className={`flex items-center gap-3 py-1 ${dominant ? '' : 'opacity-65'}`}>
      <span className="text-sm w-5 text-center flex-shrink-0">{meta.icon}</span>
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

  return (
    <div>
      {title && <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-3">{title}</p>}

      {/* Dominant pill */}
      {!compact && (
        <motion.div initial={{ scale: .93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-3 rounded-xl p-4 mb-4 border"
          style={{ backgroundColor: `${color}10`, borderColor: `${color}22` }}>
          <span className="text-3xl">{icon}</span>
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