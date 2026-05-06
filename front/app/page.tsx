'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, ArrowRight, Loader2 } from 'lucide-react'
import { api, getToken, setToken } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  useEffect(() => { if (getToken()) router.replace('/dashboard') }, [router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await api.login(email, password)
      setToken(res.access_token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-16 relative overflow-hidden bg-charcoal">
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(232,184,75,1) 1px,transparent 1px),linear-gradient(90deg,rgba(232,184,75,1) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />
        {/* Glow */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 25% 55%, rgba(255,77,28,.13) 0%,transparent 60%)' }} />

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}
          className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center">
            <Eye size={16} className="text-gold" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">EmoVision</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .15 }}
          className="relative z-10">
          <p className="font-mono text-[10px] tracking-[.35em] text-gold uppercase mb-5">Emotion Intelligence</p>
          <h1 className="font-display text-5xl xl:text-6xl leading-[1.08] text-white mb-6">
            See what<br /><span className="gradient-text">feelings</span><br />look like.
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
            AI-powered emotion detection in images, videos, and live webcam streams.
            Track emotional arcs, identify dominant feelings, and understand every frame.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .45 }}
          className="relative z-10 grid grid-cols-3 gap-6">
          {[['7', 'Emotions'], ['∞', 'Video Length'], ['Live', 'Webcam']].map(([v, l]) => (
            <div key={l}>
              <div className="font-display text-3xl text-gold mb-1">{v}</div>
              <div className="text-zinc-600 text-[10px] font-mono tracking-widest uppercase">{l}</div>
            </div>
          ))}
        </motion.div>

        {/* Floating emojis */}
        {['😊','😢','😠','😲','😨'].map((e, i) => (
          <motion.div key={e} className="absolute text-2xl pointer-events-none select-none"
            style={{ top: `${18 + i * 13}%`, right: `${8 + (i % 3) * 4}%`, opacity: .12 }}
            animate={{ y: [0, -10, 0], rotate: [-4, 4, -4] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * .6, ease: 'easeInOut' }}>
            {e}
          </motion.div>
        ))}
      </div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .7 }}
          className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/25 flex items-center justify-center">
              <Eye size={14} className="text-gold" />
            </div>
            <span className="font-display text-lg font-bold">EmoVision</span>
          </div>

          <h2 className="font-display text-3xl text-white mb-1">Welcome back.</h2>
          <p className="text-zinc-500 text-sm mb-10">Sign in to your account</p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Email</label>
              <input type="email" className="input-field" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Password</label>
              <input type="password" className="input-field" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-red-400 text-sm bg-red-400/8 border border-red-400/20 rounded-xl px-4 py-3">
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Sign In</span><ArrowRight size={15} /></>}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-8">
            No account?{' '}
            <Link href="/signup" className="text-gold hover:text-yellow-300 transition-colors">Create one</Link>
          </p>

          <div className="mt-10 pt-8 border-t border-border">
            <p className="text-center text-[11px] text-zinc-700 font-mono">
              Supports images · videos · live webcam · 0 data retained
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}