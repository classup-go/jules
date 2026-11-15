'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: classroomId } = use(params)
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_free: true,
    price: 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // Validation
      if (!formData.title || formData.title.length < 5) {
        setError('Le titre doit contenir au moins 5 caractères')
        setIsSubmitting(false)
        return
      }

      if (!formData.is_free && (!formData.price || formData.price <= 0)) {
        setError('Veuillez définir un prix pour le cours payant')
        setIsSubmitting(false)
        return
      }

      // Get classroom info for subject and level
      const supabase = createClient()
      const { data: classroom } = await supabase
        .from('classrooms')
        .select('subject, level')
        .eq('id', classroomId)
        .single()

      // Create course
      const courseResponse = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          title: formData.title,
          description: formData.description,
          subject: classroom?.subject || '',
          level: classroom?.level || '',
          access_type: formData.is_free ? 'free' : 'premium',
          price: formData.is_free ? 0 : formData.price,
          is_published: false,
        })
      })

      if (!courseResponse.ok) {
        const errorData = await courseResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de la création du cours')
      }

      const course = await courseResponse.json()
      console.log('✅ Course created:', course.id)

      // Redirect to classroom detail
      router.push(`/teacher/classrooms/${classroomId}?courseCreated=true`)

    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            href={`/teacher/classrooms/${classroomId}`}
            style={{ color: '#617589', textDecoration: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
          >
            ← Retour à la classe
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111418', marginBottom: '8px' }}>
            📚 Créer un nouveau cours
          </h1>
          <p style={{ color: '#617589', fontSize: '14px' }}>
            Ajoutez un cours à votre classe
          </p>
        </div>

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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '32px', marginBottom: '24px' }}>
            {/* Title */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '14px' }}>
                Titre du cours <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Introduction à l'algèbre"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #dbe0e6', fontSize: '14px' }}
                required
              />
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                Minimum 5 caractères
              </p>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '8px', fontSize: '14px' }}>
                Description (optionnel)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez brièvement le contenu de ce cours..."
                rows={4}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #dbe0e6', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            {/* Pricing */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontWeight: '600', color: '#111418', marginBottom: '12px', fontSize: '14px' }}>
                Accès au cours
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Free option */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${formData.is_free ? '#16a34a' : '#dbe0e6'}`,
                    backgroundColor: formData.is_free ? 'rgba(22, 163, 74, 0.05)' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    checked={formData.is_free}
                    onChange={() => setFormData({ ...formData, is_free: true, price: 0 })}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', color: '#111418', marginBottom: '2px' }}>Gratuit</div>
                    <div style={{ fontSize: '13px', color: '#617589' }}>Accessible à tous les élèves de la classe</div>
                  </div>
                </label>

                {/* Paid option */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${!formData.is_free ? '#2b8cee' : '#dbe0e6'}`,
                    backgroundColor: !formData.is_free ? 'rgba(43, 140, 238, 0.05)' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    checked={!formData.is_free}
                    onChange={() => setFormData({ ...formData, is_free: false })}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '2px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#111418', marginBottom: '2px' }}>Payant</div>
                    <div style={{ fontSize: '13px', color: '#617589', marginBottom: '12px' }}>
                      Les élèves devront payer pour accéder au cours
                    </div>
                    {!formData.is_free && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          placeholder="19.99"
                          style={{ width: '120px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #dbe0e6', fontSize: '14px' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span style={{ fontWeight: '600', color: '#111418' }}>€</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(43, 140, 238, 0.05)', borderRadius: '16px', border: '1px solid rgba(43, 140, 238, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>💡</span>
              <div>
                <p style={{ fontWeight: '600', color: '#111418', marginBottom: '4px', fontSize: '14px' }}>
                  Prochaine étape
                </p>
                <p style={{ color: '#617589', fontSize: '13px', lineHeight: '1.6' }}>
                  Après avoir créé votre cours, vous pourrez ajouter des chapitres et des leçons pour structurer votre contenu pédagogique.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <Link
              href={`/teacher/classrooms/${classroomId}`}
              style={{
                padding: '14px 28px',
                backgroundColor: 'white',
                color: '#374151',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              ← Annuler
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '14px 32px',
                background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #2b8cee, #1d4ed8)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                cursor: isSubmitting ? 'wait' : 'pointer',
                boxShadow: '0 4px 15px rgba(43, 140, 238, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Création en cours...
                </>
              ) : (
                <>✅ Créer le cours</>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
