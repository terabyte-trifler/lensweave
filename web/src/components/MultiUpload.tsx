'use client'

import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'

type Result = { cid: string; url: string; size: number; count: number }

export default function MultiUpload({ onComposed }: { onComposed?: (r: Result) => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  // Revoke object URLs when they change/unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [previews])

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => {
      const next = [...prev, ...accepted].slice(0, 6)
      // build previews for the new list
      const urls = next.map((f) => URL.createObjectURL(f))
      setPreviews((old) => {
        // revoke old previews before replacing
        old.forEach((u) => URL.revokeObjectURL(u))
        return urls
      })
      return next
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
    maxFiles: 6,
  })

  const compose = async () => {
    if (files.length < 2) {
      alert('Add at least 2 photos first')
      return
    }
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    setBusy(true)
    try {
      const res = await fetch('/api/compose', { method: 'POST', body: form })
      const data: Result & { error?: string } = await res.json()
      if (!res.ok) throw new Error(data.error || 'Compose failed')
      setResult(data)
      onComposed?.(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Compose failed'
      alert(msg)
    } finally {
      setBusy(false)
    }
  }

  const clearAll = () => {
    setFiles([])
    previews.forEach((u) => URL.revokeObjectURL(u))
    setPreviews([])
    setResult(null)
  }

  return (
    <section className="border rounded-2xl p-6 space-y-4">
      <h3 className="font-semibold">Collaborative Composer</h3>

      <div
        {...getRootProps()}
        className={`h-40 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer ${
          isDragActive ? 'bg-gray-50' : ''
        }`}
        aria-label="Dropzone for selecting up to 6 photos"
      >
        <input {...getInputProps()} aria-label="Upload photos" />
        <span className="text-gray-600">
          {isDragActive ? 'Drop to add' : 'Drag & drop 2–6 photos, or click'}
        </span>
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previews.map((src) => (
            <Image
              key={src}
              src={src}
              alt="Selected photo"
              width={512}
              height={512}
              unoptimized
              className="w-full h-28 object-cover rounded-lg"
            />
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={compose}
          disabled={busy || files.length < 2}
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {busy ? 'Composing…' : 'Compose'}
        </button>
        <button onClick={clearAll} className="px-3 py-2 rounded bg-gray-200">
          Clear
        </button>
      </div>

      {result && (
        <div className="space-y-2">
          <p className="text-sm text-gray-700">
            Done — blended {result.count} photos into {result.size}px square.
          </p>
          <p className="text-sm">
            IPFS: <code className="break-all">{result.url}</code>
          </p>
          <Image
            src={`https://ipfs.io/ipfs/${result.cid}`}
            alt="Composited result"
            width={1024}
            height={1024}
            unoptimized
            className="w-full rounded-xl"
          />
        </div>
      )}
    </section>
  )
}
