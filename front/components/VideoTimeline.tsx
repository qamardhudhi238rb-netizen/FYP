'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Clock } from 'lucide-react'
import type { VideoSegment } from '@/lib/api'

interface Props {
  segments:          VideoSegment[]
  totalDuration:     number
  durationFormatted: string
}

export default function VideoTimeline({ segments, totalDuration, durationFormatted }: Props) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      {/* Visual bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Emotional Timeline</p>
          <span className="text-[11px] text-zinc-600 font-mono flex items-center gap-1">
            <Clock size={10} />{durationFormatted}
          </span>
        </div>
        <div className="relative h-9 rounded-xl overflow-hidden bg-mist flex">
          {segments.map((seg, i) => {
            const pct = totalDuration > 0 ? (seg.duration_seconds / totalDuration) * 100 : 0
            return (
              <motion.div key={i}
                className="seg relative group cursor-pointer"
                style={{ width: `${pct}%`, backgroundColor: seg.color, minWidth: pct < 0.8 ? '3px' : undefined,
                  opacity: open === i ? 1 : 0.7 }}
                initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                transition={{ delay: i * .04, duration: .4 }}
                onClick={() => setOpen(open === i ? null : i)}>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100
                  transition-opacity z-20 pointer-events-none whitespace-nowrap">
                  <div className="bg-charcoal border border-border rounded-lg px-2.5 py-1.5 shadow-xl text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                      <p className="text-[11px] font-mono text-white">{seg.emotion}</p>
                    </div>
                    <p className="text-[10px] text-zinc-500">{seg.start_formatted}–{seg.end_formatted}</p>
                  </div>
                </div>
                {pct > 7 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-white/70 select-none">{seg.emotion}</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] font-mono text-zinc-700">0:00</span>
          <span className="text-[10px] font-mono text-zinc-700">{durationFormatted}</span>
        </div>
      </div>

      {/* Segment list */}
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * .04 }}
            className="rounded-xl border overflow-hidden cursor-pointer"
            style={{ borderColor: open === i ? `${seg.color}35` : '#32323C',
              backgroundColor: open === i ? `${seg.color}07` : 'transparent' }}
            onClick={() => setOpen(open === i ? null : i)}>
              <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium capitalize">{seg.emotion}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${seg.color}18`, color: seg.color }}>
                    {seg.confidence.toFixed(0)}%
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  {seg.start_formatted} → {seg.end_formatted}
                  <span className="ml-2 text-zinc-700">({seg.duration_seconds.toFixed(1)}s)</span>
                </p>
              </div>
              <ChevronDown size={13} className={`text-zinc-600 transition-transform flex-shrink-0 ${open === i ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence>
              {open === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: .28 }}
                  className="border-t border-mist/60">
                  <div className="px-4 py-3 space-y-1.5">
                    {Object.entries(seg.emotion_scores).sort(([, a], [, b]) => b - a).map(([emo, val]) => (
                      <div key={emo} className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-600 w-14 font-mono capitalize">{emo}</span>
                        <div className="flex-1 h-1.5 bg-mist rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full"
                            style={{ backgroundColor: seg.emotion === emo ? seg.color : '#4B5563' }}
                            initial={{ width: 0 }} animate={{ width: `${val}%` }}
                            transition={{ duration: .55, ease: 'easeOut' }} />
                        </div>
                        <span className="text-[11px] font-mono text-zinc-600 w-8 text-right">{val.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  )
}