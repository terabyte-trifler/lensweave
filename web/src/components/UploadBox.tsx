// src/components/UploadBox.tsx
'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'

type UploadBoxProps = {
  onFiles: (files: File[]) => void
  multiple?: boolean
  accept?: string
  label?: string
}

export default function UploadBox({
  onFiles,
  multiple = true,
  accept = 'image/*',
  label = 'Upload photos',
}: UploadBoxProps) {
  const [previews, setPreviews] = useState<string[]>([])

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.currentTarget.files
      if (!fileList || fileList.length === 0) return
      const files = Array.from(fileList)
      onFiles(files)

      // build previews
      const urls = files.map((f) => URL.createObjectURL(f))
      setPreviews(urls)
    },
    [onFiles],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault()
      const dt = e.dataTransfer
      const fileList = dt?.files
      if (!fileList || fileList.length === 0) return
      const files = Array.from(fileList)
      onFiles(files)

      const urls = files.map((f) => URL.createObjectURL(f))
      setPreviews(urls)
    },
    [onFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
  }, [])

  return (
    <div className="space-y-3">
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50"
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInput}
          className="hidden"
        />
        <div className="text-sm text-gray-700">{label}</div>
        <div className="text-xs text-gray-500">Drag & drop or click to select</div>
      </label>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src={src}
                alt={`preview ${i + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
