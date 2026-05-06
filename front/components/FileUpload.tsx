'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ImageIcon, Film, X, Zap, Loader2 } from 'lucide-react'
import { api, AnalysisResult } from '@/lib/api'

interface Props {
  onResult: (result: AnalysisResult, file: File) => void
  onError:  (msg: string) => void
}

type State = 'idle' | 'uploading' | 'analyzing'

export default function FileUpload({ onResult, onError }: Props) {
  const [file, setFile]         = useState<File | null>(null)
  const [preview, setPreview]   = useState<string | null>(null)
  const [state, setState]       = useState<State>('idle')
  const [progress, setProgress] = useState(0)

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0]; if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    onError('')
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
  }, [preview, onError])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg','.jpeg','.png','.webp','.bmp','.gif'],
      'video/*': ['.mp4','.mov','.avi','.webm','.mpeg'],
    },
    maxFiles: 1,
    disabled: state !== 'idle',
  })

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null); setPreview(null); setState('idle'); setProgress(0)
  }

  const analyze = async () => {
    if (!file) return
    setState('uploading')
    let prog = 0
    const tick = setInterval(() => { prog = Math.min(prog + Math.random() * 7, 84); setProgress(Math.round(prog)) }, 280)
    try {
      setState('analyzing')
      const isVid = file.type.startsWith('video/')
      const res   = isVid ? await api.analyzeVideo(file) : await api.analyzeImage(file)
      clearInterval(tick); setProgress(100)
      setTimeout(() => { onResult(res, file); clear() }, 350)
    } catch (err: any) {
      clearInterval(tick); onError(err.message || 'Analysis failed'); setState('idle'); setProgress(0)
    }
  }

  const isVideo    = file?.type.startsWith('video/')
  const processing = state !== 'idle'

  return (
    <div className="space-y-4">
      <div {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 overflow-hidden
          ${isDragActive  ? 'border-gold bg-gold/5 scale-[1.01]' : ''}
          ${file && !isDragActive ? 'border-border bg-charcoal' : ''}
          ${!file && !isDragActive ? 'border-border hover:border-gold/40 hover:bg-charcoal/40' : ''}
          ${processing ? 'pointer-events-none' : ''}`}>
        <input {...getInputProps()} />

        {/* Scan line while processing */}
        {processing && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
            <div className="scan-line" />
          </div>
        )}

        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div key="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-mist flex items-center justify-center">
                <Upload size={22} className="text-zinc-500" />
              </div>
              <div>
                <p className="text-white text-sm font-medium mb-1">{isDragActive ? 'Drop it!' : 'Drop your file here'}</p>
                <p className="text-zinc-600 text-xs">Images (JPG, PNG, WEBP) or Videos (MP4, MOV, AVI) — up to 200 MB</p>
              </div>
              <div className="flex gap-2 mt-1">
                <span className="flex items-center gap-1.5 text-xs text-zinc-600 bg-mist/60 px-3 py-1.5 rounded-full">
                  <ImageIcon size={10} /> Image
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-600 bg-mist/60 px-3 py-1.5 rounded-full">
                  <Film size={10} /> Video
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div key="file" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
              {preview ? (
                <div className="w-24 h-24 rounded-xl overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl bg-mist flex items-center justify-center border border-border">
                  <Film size={28} className="text-zinc-500" />
                </div>
              )}
              <div className="text-center">
                <p className="text-white text-sm font-medium truncate max-w-[260px]">{file.name}</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {isVideo ? '🎬 Video' : '🖼️ Image'} · {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {processing && (
                <div className="w-full max-w-xs">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                    <span className="font-mono">{state === 'uploading' ? 'Uploading…' : 'Analysing emotions…'}</span>
                    <span className="font-mono">{progress}%</span>
                  </div>
                  <div className="h-1 bg-mist rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-gold to-ember"
                      animate={{ width: `${progress}%` }} transition={{ duration: .3 }} />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Buttons */}
      <AnimatePresence>
        {file && !processing && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex gap-3">
            <button onClick={clear} className="btn-ghost flex-1 flex items-center justify-center gap-2 py-2.5 text-sm">
              <X size={13} /> Clear
            </button>
            <button onClick={analyze} className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-sm">
              <Zap size={13} /> Analyse
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {processing && (
        <p className="text-center text-xs text-zinc-600 font-mono flex items-center justify-center gap-2">
          <Loader2 size={12} className="animate-spin text-gold" />
          {isVideo ? 'Processing video frames — this may take a moment…' : 'Running emotion detection…'}
        </p>
      )}
    </div>
  )
}