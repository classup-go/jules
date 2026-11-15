'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Step1ClassInfo } from './steps/Step1ClassInfo'
import { createClient } from '@/lib/supabase/client'

interface SimpleClassData {
  class_name: string
  subject: string
  level: string
  class_type: 'cursus' | 'intensive'
  is_public: boolean
}

const STEPS = [
  { number: 1, label: 'Informations de la classe', icon: '🏫', shortLabel: 'Infos' }
]

export function SimpleClassWizard() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<SimpleClassData>({
    mode: 'onChange',
    defaultValues: {
      class_name: '',
      subject: '',
      level: '',
      class_type: 'cursus',
      is_public: false,
    }
  })

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const data = form.getValues()

      // Validation
      if (!data.class_name || data.class_name.length < 5) {
        setError('Le nom doit contenir au moins 5 caractères')
        setIsSubmitting(false)
        return
      }

      if (!data.subject) {
        setError('Veuillez sélectionner une matière')
        setIsSubmitting(false)
        return
      }

      if (!data.level) {
        setError('Veuillez sélectionner un niveau')
        setIsSubmitting(false)
        return
      }

      // Create classroom
      const classResponse = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.class_name,
          subject: data.subject,
          level: data.level,
          is_public: data.is_public,
        })
      })

      if (!classResponse.ok) {
        const errorData = await classResponse.json()
        throw new Error(errorData.error || 'Erreur lors de la création de la classe')
      }

      const classroom = await classResponse.json()
      console.log('✅ Classroom created with ID:', classroom.id)

      // Redirect to success page
      router.push(`/teacher/classrooms/${classroom.id}?success=true&firstTime=true`)

    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Progress Header */}
      <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)', padding: '24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🎉</span>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>
              Créer une nouvelle classe
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
              Définissez les informations de base de votre classe
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
        {error && (
          <div style={{ marginBottom: '24px', backgroundColor: '#fef2f2', border: '2px solid #fecaca', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', color: '#991b1b' }}>Erreur</div>
              <div style={{ color: '#dc2626', fontSize: '14px' }}>{error}</div>
            </div>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#dc2626' }}>×</button>
          </div>
        )}

        <div style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '32px', marginBottom: '24px' }}>
          <Step1ClassInfo form={form} />
        </div>

        {/* Info Banner */}
        <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: 'rgba(139, 92, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <div>
              <p style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Prochaine étape</p>
              <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
                Après avoir créé votre classe, vous pourrez ajouter vos cours et commencer à créer du contenu pédagogique.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            style={{ padding: '14px 28px', backgroundColor: 'white', color: '#374151', border: '2px solid #e5e7eb', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
          >
            ← Retour
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ padding: '14px 32px', background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: isSubmitting ? 'wait' : 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isSubmitting ? (
              <><div style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />Création en cours...</>
            ) : (
              <>✅ Créer la classe</>
            )}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
