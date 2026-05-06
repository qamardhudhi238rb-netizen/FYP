'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { api, getToken, setToken } from '@/lib/api'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  useEffect(() => { if (getToken()) router.replace('/dashboard') }, [router])

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : password.length < 14 ? 3 : 4
  const strengthColor = ['', '#EF4444', '#F97316', '#EAB308', '#22C55E'][strength]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      const res = await api.register(name, email, password)
      setToken(res.access_token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const perks = [
    'Analyse unlimited images & videos',
    'Live webcam emotion tracking',
    'Timestamped video emotion segments',
    'Zero data retained — fully private',
  ]

  return (
    <div className="min-h-screen flex">
      {/* ── Left — form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .7 }}
          className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/25 flex items-center justify-center">
              <Eye size={14} className="text-gold" />
            </div>
            <span className="font-display text-lg font-bold">EmoVision</span>
          </div>

          <h2 className="font-display text-3xl text-white mb-1">Create your account.</h2>
          <p className="text-zinc-500 text-sm mb-10">Start reading emotions in seconds</p>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Full Name</label>
              <input type="text" className="input-field" placeholder="Your name"
                value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Email</label>
              <input type="email" className="input-field" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Password</label>
              <input type="password" className="input-field" placeholder="At least 6 characters"
                value={password} onChange={e => setPassword(e.target.value)} required />
              {password.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{ backgroundColor: strength >= i ? strengthColor : '#27272F' }} />
                  ))}
                </div>
              )}
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-red-400 text-sm bg-red-400/8 border border-red-400/20 rounded-xl px-4 py-3">
                {error}
              </motion.p>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Create Account</span><ArrowRight size={15} /></>}
            </button>
          </form>

          <p className="text-center text-zinc-500 text-sm mt-8">
            Already have an account?{' '}
            <Link href="/" className="text-gold hover:text-yellow-300 transition-colors">Sign in</Link>
          </p>
        </motion.div>
      </div>

      {/* ── Right — perks ── */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center p-16 relative overflow-hidden bg-charcoal">
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(110,231,247,1) 1px,transparent 1px),linear-gradient(90deg,rgba(110,231,247,1) 1px,transparent 1px)', backgroundSize: '56px 56px' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(110,231,247,.08) 0%,transparent 60%)' }} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2 }}
          className="relative z-10">
          <p className="font-mono text-[10px] tracking-[.35em] text-ice uppercase mb-5">What you get</p>
          <h2 className="font-display text-4xl text-white mb-12 leading-tight">
            Powered by<br /><span style={{ color: '#6EE7F7' }}>deep learning.</span>
          </h2>

          <div className="space-y-5 mb-14">
            {perks.map((p, i) => (
              <motion.div key={p} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: .4 + i * .1 }} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-ice/10 border border-ice/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 size={13} className="text-ice" />
                </div>
                <span className="text-zinc-300 text-sm">{p}</span>
              </motion.div>
            ))}
          </div>

          {/* Emotion spectrum preview */}
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Emotion Spectrum</p>
          {[
            { l: 'Happy',    c: '#FFD700', w: '88%' },
            { l: 'Sad',      c: '#4169E1', w: '72%' },
            { l: 'Angry',    c: '#DC143C', w: '65%' },
            { l: 'Surprise', c: '#FF8C00', w: '79%' },
            { l: 'Fear',     c: '#800080', w: '55%' },
            { l: 'Neutral',  c: '#808080', w: '94%' },
          ].map((item, i) => (
            <motion.div key={item.l} className="flex items-center gap-3 mb-2"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .9 + i * .08 }}>
              <span className="text-[11px] text-zinc-600 w-14 font-mono">{item.l}</span>
              <div className="flex-1 h-1.5 bg-mist rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: item.c }}
                  initial={{ width: 0 }} animate={{ width: item.w }}
                  transition={{ duration: 1, delay: 1.1 + i * .08, ease: 'easeOut' }} />
              </div>
              <span className="text-[11px] text-zinc-700 w-8 font-mono">{item.w}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}