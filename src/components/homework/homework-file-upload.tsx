'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import HomeworkFileDisplay from './homework-file-display';

interface HomeworkFileUploadProps {
  onUpload: (fileUrls: string[]) => void;
  maxFiles?: number;
  maxSize?: number; // in MB
  existingFiles?: string[];
}

export default function HomeworkFileUpload({
  onUpload,
  maxFiles = 5,
  maxSize = 50,
  existingFiles = []
}: HomeworkFileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(existingFiles);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check max files limit
    if (uploadedFiles.length + files.length > maxFiles) {
      setError(`Maximum ${maxFiles} fichiers autorisés`);
      return;
    }

    // Check file sizes
    for (const file of files) {
      if (file.size > maxSize * 1024 * 1024) {
        setError(`${file.name} dépasse ${maxSize}MB`);
        return;
      }
    }

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Vous devez être connecté');
        setUploading(false);
        return;
      }

      const newFileUrls: string[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${i}.${fileExt}`;

        const { data, error: uploadError } = await supabase.storage
          .from('homework-files')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Erreur upload ${file.name}: ${uploadError.message}`);
        }

        // Store the file path instead of URL
        // We'll generate signed URLs when displaying
        newFileUrls.push(data.path);
        setProgress(Math.floor(((i + 1) / totalFiles) * 100));
      }

      const allFiles = [...uploadedFiles, ...newFileUrls];
      setUploadedFiles(allFiles);
      onUpload(allFiles);
      setProgress(100);

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Erreur lors du téléchargement');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onUpload(newFiles);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="*/*"
        onChange={handleUpload}
        style={{ display: 'none' }}
      />

      {/* Upload Button */}
      {uploadedFiles.length < maxFiles && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            width: '100%',
            padding: '16px',
            border: '2px dashed #dbe0e6',
            borderRadius: '12px',
            backgroundColor: uploading ? '#f3f4f6' : 'white',
            cursor: uploading ? 'not-allowed' : 'pointer',
            marginBottom: '16px'
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📤</div>
          <p style={{ color: '#2b8cee', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
            {uploading ? 'Téléchargement en cours...' : 'Ajouter des fichiers'}
          </p>
          <p style={{ fontSize: '12px', color: '#617589' }}>
            Max {maxFiles} fichiers • {maxSize}MB chacun
          </p>
        </button>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            height: '6px',
            backgroundColor: '#e5e7eb',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: '#2b8cee',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <p style={{ fontSize: '12px', color: '#617589', textAlign: 'center', marginTop: '4px' }}>
            {progress}%
          </p>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#111418', marginBottom: '8px' }}>
            Fichiers ajoutés ({uploadedFiles.length}/{maxFiles})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {uploadedFiles.map((filePath, index) => (
              <HomeworkFileDisplay
                key={index}
                filePath={filePath}
                showRemove={true}
                onRemove={() => removeFile(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px'
        }}>
          <p style={{ color: '#dc2626', fontSize: '13px' }}>
            ⚠️ {error}
          </p>
        </div>
      )}
    </div>
  );
}
