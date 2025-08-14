'use client'
import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

type Result = { cid: string; url: string; size: number; count: number }

export default function MultiUpload({ onComposed }: { onComposed?: (r: Result) => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    const next = [...files, ...accepted].slice(0, 6)
    setFiles(next)
    setPreviews(next.map(f => URL.createObjectURL(f)))
  }, [files])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, multiple: true, maxFiles: 6,
  })

  const compose = async () => {
    if (!files.length) return alert('Add some photos first')
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    setBusy(true)
    try {
      const res = await fetch('/api/compose', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'compose failed')
      setResult(data)
      onComposed?.(data)
    } catch (e: unknown) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  const clearAll = () => {
    setFiles([]); setPreviews([]); setResult(null)
  }

  return (
    <section className="border rounded-2xl p-6 space-y-4">
      <h3 className="font-semibold">Collaborative Composer</h3>

      <div
        {...getRootProps()}
        className={`h-40 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer ${isDragActive ? 'bg-gray-50' : ''}`}
      >
        <input {...getInputProps()} />
        <span className="text-gray-600">
          {isDragActive ? 'Drop to add' : 'Drag & drop 2–6 photos, or click'}
        </span>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previews.map((src, i) => (
            <img key={i} src={src} className="w-full h-28 object-cover rounded-lg" />
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={compose} disabled={busy || files.length < 2} className="px-3 py-2 rounded bg-black text-white disabled:opacity-50">
          {busy ? 'Composing…' : 'Compose'}
        </button>
        <button onClick={clearAll} className="px-3 py-2 rounded bg-gray-200">Clear</button>
      </div>

      {result && (
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            Done — blended {result.count} photos into {result.size}px square.
          </p>
          <p className="text-sm">IPFS: <code className="break-all">{result.url}</code></p>
          <img src={`https://ipfs.io/ipfs/${result.cid}`} className="w-full rounded-xl" />
        </div>
      )}
    </section>
  )
}
