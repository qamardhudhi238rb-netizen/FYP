'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, LogOut, Zap, BarChart3, Camera, AlertCircle, ChevronRight, Upload, Lock } from 'lucide-react'
import { api, getToken, clearToken, type AnalysisResult, type UserData } from '@/lib/api'
import FileUpload from '@/components/FileUpload'
import AnalysisResultPanel from '@/components/AnalysisResultPanel'
import { EMOTION_META } from '@/components/EmotionBreakdown'
import dynamic from 'next/dynamic'

// Dynamically import RealtimeCamera (uses browser APIs — no SSR)
const RealtimeCamera = dynamic(() => import('@/components/RealtimeCamera'), { ssr: false })

type Tab = 'upload' | 'camera'

interface HistoryEntry {
  id:     string
  result: AnalysisResult
  file:   File
}

export default function DashboardPage() {
  const router = useRouter()
  const [user,      setUser]      = useState<UserData | null>(null)
  const [tab,       setTab]       = useState<Tab>('upload')
  const [result,    setResult]    = useState<AnalysisResult | null>(null)
  const [resFile,   setResFile]   = useState<File | null>(null)
  const [error,     setError]     = useState('')
  const [history,   setHistory]   = useState<HistoryEntry[]>([])

  useEffect(() => {
    if (!getToken()) { router.replace('/'); return }
    api.me().then(setUser).catch(() => { clearToken(); router.replace('/') })
  }, [router])

  const logout = () => { clearToken(); router.push('/') }

  const handleResult = (res: AnalysisResult, file: File) => {
    setResult(res); setResFile(file); setError('')
    setHistory(prev => [{ id: Date.now().toString(), result: res, file }, ...prev.slice(0, 9)])
    if (user) setUser(u => u ? { ...u, analyses_count: u.analyses_count + 1 } : u)
  }

  return (
    <div className="min-h-screen bg-obsidian flex flex-col">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 border-b border-border/60 px-6 py-3.5
        bg-obsidian/90 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gold/12 border border-gold/22 flex items-center justify-center">
            <Eye size={14} className="text-gold" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">EmoVision</span>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-2 bg-charcoal border border-border/60 rounded-full px-3 py-1.5">
                <Zap size={11} className="text-gold" />
                <span className="text-zinc-400 font-mono text-[11px]">{user.analyses_count} analyses</span>
              </div>
              <span className="text-zinc-500 text-xs truncate max-w-[140px]">{user.name}</span>
            </div>
          )}
          <button onClick={logout}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-sm">
            <LogOut size={14} />
            <span className="hidden sm:inline text-xs">Out</span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* Left / main */}
        <div className="xl:col-span-2 space-y-6">
          {/* Greeting */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-3xl text-white mb-1">
              Hello, {user?.name?.split(' ')[0] ?? 'there'}.
            </h1>
            <p className="text-zinc-500 text-sm">Upload media or use your camera to detect emotions.</p>
          </motion.div>

          {/* Tab card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }}
            className="card overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-border/60">
              {([
                { id: 'upload', label: 'Upload',      icon: Upload },
                { id: 'camera', label: 'Live Camera', icon: Camera },
              ] as { id: Tab; label: string; icon: any }[]).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all relative
                    ${tab === t.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  <t.icon size={14} />
                  {t.label}
                  {tab === t.id && (
                    <motion.div layoutId="tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-t-full" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {tab === 'upload' ? (
                  <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-2 mb-5">
                      <BarChart3 size={15} className="text-gold" />
                      <h2 className="text-white text-sm font-semibold">Analyse Image or Video</h2>
                    </div>
                    <FileUpload onResult={handleResult} onError={setError} />
                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="mt-4 flex items-start gap-3 text-red-400 text-sm
                            bg-red-400/6 border border-red-400/18 rounded-xl px-4 py-3">
                          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex items-center gap-2 mb-5">
                      <Camera size={15} className="text-ice" />
                      <h2 className="text-white text-sm font-semibold">Real-time Webcam Detection</h2>
                      <span className="ml-auto text-[10px] font-mono text-zinc-600 bg-mist px-2 py-0.5 rounded-full">
                        ~600ms latency
                      </span>
                    </div>
                    <RealtimeCamera />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Analysis result */}
          <AnimatePresence mode="wait">
            {result && resFile && (
              <AnalysisResultPanel
                key={result.filename + Date.now()}
                result={result} file={resFile}
                onClose={() => { setResult(null); setResFile(null) }} />
            )}
          </AnimatePresence>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">
          <motion.div initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .15 }}>
            <h2 className="text-sm font-semibold text-white mb-0.5">Recent Analyses</h2>
            <p className="text-zinc-600 text-xs font-mono">Session only — not persisted</p>
          </motion.div>

          <AnimatePresence>
            {history.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="card p-8 text-center">
                <div className="mb-3 opacity-20">
                  <div className="w-12 h-12 rounded-full bg-mist mx-auto" />
                </div>
                <p className="text-zinc-600 text-sm">Analyses will appear here</p>
              </motion.div>
            ) : (
              <div className="space-y-2.5">
                {history.map((h, i) => (
                  <motion.div key={h.id}
                    initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * .04 }}
                    className="card p-3.5 cursor-pointer hover:border-border transition-all group"
                    onClick={() => { setResult(h.result); setResFile(h.file); setTab('upload') }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: `${h.result.overall.color}14`, border: `1px solid ${h.result.overall.color}28` }}>
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: h.result.overall.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">
                          {h.result.filename ?? 'Untitled'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono capitalize" style={{ color: h.result.overall.color }}>
                            {h.result.overall.dominant_emotion}
                          </span>
                          <span className="text-zinc-700 text-xs">·</span>
                          <span className="text-zinc-600 text-xs font-mono">{h.result.type}</span>
                        </div>
                      </div>
                      <ChevronRight size={13} className="text-zinc-700 group-hover:text-gold transition-colors flex-shrink-0" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Emotion legend */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .3 }}
            className="card p-5">
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Emotions</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(EMOTION_META).map(e => (
                <div key={e.label} className="flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center" style={{ color: e.color }}>
                    <e.Icon className="w-4 h-4" />
                  </span>
                  <span className="text-xs text-zinc-500">{e.label}</span>
                  <div className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
                </div>
              ))}
            </div>
          </motion.div>

          <p className="text-[11px] text-zinc-700 text-center font-mono leading-relaxed px-2 flex items-center justify-center gap-2">
            <Lock size={12} className="text-zinc-700" />
            <span>Media processed in-memory. Nothing stored or retained.</span>
          </p>
        </div>
      </main>
    </div>
  )
}