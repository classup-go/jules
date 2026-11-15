'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FileUploadProps {
  bucket: string
  folder: string
  accept: string
  maxSize: number // in MB
  onUpload: (url: string) => void
  label?: string
}

export default function FileUpload({ bucket, folder, accept, maxSize, onUpload, label }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`Le fichier dépasse ${maxSize}MB`)
      return
    }

    setUploading(true)
    setProgress(0)
    setError('')
    setFileName(file.name)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Vous devez être connecté')
      setUploading(false)
      return
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()
    const uniqueName = `${folder}/${user.id}/${Date.now()}.${ext}`

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(uniqueName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    clearInterval(progressInterval)

    if (uploadError) {
      setError('Erreur lors du téléchargement')
      setUploading(false)
      return
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    setProgress(100)
    setTimeout(() => {
      setUploading(false)
      onUpload(urlData.publicUrl)
    }, 500)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleUpload}
        className="hidden"
      />

      {!uploading && !fileName ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-[#1E6DD1] hover:bg-[#E8F1FB] transition-all"
        >
          <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-[#1E6DD1] font-medium">{label || 'Cliquez pour télécharger'}</p>
          <p className="text-xs text-gray-400 mt-1">Max {maxSize}MB</p>
        </button>
      ) : uploading ? (
        <div className="w-full border-2 border-[#1E6DD1] rounded-2xl p-6 bg-[#E8F1FB]">
          <p className="text-sm text-[#1A1A2E] mb-2 truncate">{fileName}</p>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1E6DD1] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[#6B7280] mt-2">{progress}% téléchargé</p>
        </div>
      ) : (
        <div className="w-full border-2 border-green-500 rounded-2xl p-4 bg-green-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
            ✓
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-700 truncate">{fileName}</p>
            <p className="text-xs text-green-600">Téléchargé avec succès</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFileName('')
              inputRef.current?.click()
            }}
            className="text-sm text-[#1E6DD1]"
          >
            Changer
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  )
}