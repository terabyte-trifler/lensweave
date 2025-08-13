// src/components/UploadBox.tsx
'use client'
import { useState } from 'react'
import { useDropzone } from 'react-dropzone'

export default function UploadBox() {
  const [preview, setPreview] = useState<string | null>(null)
  const [ipfs, setIpfs] = useState<{ cid: string; url: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const onDrop = async (accepted: File[]) => {
    if (!accepted[0]) return
    setPreview(URL.createObjectURL(accepted[0]))
    const form = new FormData()
    form.append('file', accepted[0])
    setBusy(true)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setIpfs(data)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  })

  return (
    <section className="border rounded-2xl p-6 space-y-4">
      <div
        {...getRootProps()}
        className={`h-48 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer ${
          isDragActive ? 'bg-gray-50' : ''
        }`}
      >
        <input {...getInputProps()} />
        <span className="text-gray-600">
          {isDragActive ? 'Drop it!' : 'Drag & drop a photo, or click to select'}
        </span>
      </div>

      {preview && (
        <div className="flex gap-4 items-center">
          <img src={preview} alt="preview" className="w-40 h-40 object-cover rounded-lg" />
          <div className="text-sm">
            {busy && <p>Uploading to IPFS…</p>}
            {ipfs && (
              <>
                <p>IPFS CID: <code className="break-all">{ipfs.cid}</code></p>
                <p>URI: <code>{ipfs.url}</code></p>
              </>
            )}
          </div>
        </div>
      )}

      <RegisterOnchain ipfs={ipfs} disabled={!ipfs || busy} />
    </section>
  )
}

function RegisterOnchain({
  ipfs,
  disabled,
}: {
  ipfs: { cid: string; url: string } | null
  disabled: boolean
}) {
  const register = async () => {
    if (!ipfs) return
    const res = await fetch('/api/origin/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Untitled Photo',
        mediaCid: ipfs.cid,
        mediaUri: ipfs.url,
      }),
    })
    const data = await res.json()
    if (!res.ok) return alert(data.error || 'Origin registration failed')
    alert(`Registered! ${JSON.stringify(data)}`)
  }

  return (
    <button
      onClick={register}
      disabled={disabled}
      className="px-4 py-2 rounded bg-indigo-600 disabled:opacity-50 text-white"
    >
      Register onchain (Origin)
    </button>
  )
}
