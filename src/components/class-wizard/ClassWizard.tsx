'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Step1ClassInfo } from './steps/Step1ClassInfo'
import { Step2Objectives } from './steps/Step2Objectives'
import { Step3FirstCourse } from './steps/Step3FirstCourse'
import { Step4Content } from './steps/Step4Content'
import { createClient } from '@/lib/supabase/client'
import { getPaymentConfig } from '@/lib/payment/config'

// Define type directly here to avoid import issues
interface ClassWizardData {
  class_name: string
  subject: string
  level: string
  class_type: 'cursus' | 'intensive'
  is_public: boolean
  learning_objectives: string[]
  prerequisites: string[]
  first_course: {
    title: string
    description: string
    is_free: boolean
    price?: number
    duration_minutes?: number
    duration_hours?: number
    duration_weeks?: number
  }
  initial_content: {
    type: 'text' | 'video'
    content: string
    video_url?: string
  }
}

interface Classroom {
  id: string
  title: string
  subject: string
  level: string
  enrolled_count: number
  created_at: string
}

const STEPS = [
  { number: 1, label: 'Infos de la classe', icon: '🏫', shortLabel: 'Classe' },
  { number: 2, label: 'Objectifs pédagogiques', icon: '🎯', shortLabel: 'Objectifs' },
  { number: 3, label: 'Premier cours', icon: '📚', shortLabel: 'Cours' },
  { number: 4, label: 'Contenu initial', icon: '✍️', shortLabel: 'Contenu' }
]

const STEPS_EXISTING_CLASS = [
  { number: 1, label: 'Sélectionner la classe', icon: '📁', shortLabel: 'Classe' },
  { number: 2, label: 'Objectifs pédagogiques', icon: '🎯', shortLabel: 'Objectifs' },
  { number: 3, label: 'Nouveau cours', icon: '📚', shortLabel: 'Cours' },
  { number: 4, label: 'Contenu initial', icon: '✍️', shortLabel: 'Contenu' }
]

export function ClassWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'new' | 'existing' | null>(null)
  const [existingClasses, setExistingClasses] = useState<Classroom[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [loadingClasses, setLoadingClasses] = useState(false)

  const form = useForm<ClassWizardData>({
    mode: 'onChange',
    defaultValues: {
      class_name: '',
      subject: '',
      level: '',
      class_type: 'cursus',
      is_public: false,
      learning_objectives: [''],
      prerequisites: [],
      first_course: {
        title: '',
        description: '',
        is_free: true,
        price: undefined,
        duration_minutes: undefined,
        duration_hours: undefined,
        duration_weeks: undefined
      },
      initial_content: {
        type: 'text',
        content: ''
      }
    }
  })

  useEffect(() => {
    if (mode === 'existing') {
      loadExistingClasses()
    }
  }, [mode])

  const loadExistingClasses = async () => {
    setLoadingClasses(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data } = await supabase
          .from('classrooms')
          .select('id, title, subject, level, enrolled_count, created_at')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false })
        
        if (data) {
          setExistingClasses(data)
        }
      }
    } catch (err) {
      console.error('Error loading classes:', err)
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleModeSelect = (selectedMode: 'new' | 'existing') => {
    setMode(selectedMode)
    setCurrentStep(1)
  }

  const handleClassSelect = (classId: string) => {
    setSelectedClassId(classId)
    const selectedClass = existingClasses.find(c => c.id === classId)
    if (selectedClass) {
      form.setValue('subject', selectedClass.subject)
      form.setValue('level', selectedClass.level)
    }
  }

  const handleNext = async () => {
    setError(null)

    if (mode === 'existing' && currentStep === 1) {
      if (!selectedClassId) {
        setError('Veuillez sélectionner une classe')
        return
      }
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const steps = mode === 'existing' ? STEPS_EXISTING_CLASS : STEPS
    let canProceed = true

    switch (currentStep) {
      case 1:
        if (mode === 'new') {
          const className = form.getValues('class_name')
          const subject = form.getValues('subject')
          const level = form.getValues('level')
          
          if (!className || className.length < 5) {
            setError('Le nom doit contenir au moins 5 caractères')
            canProceed = false
          } else if (!subject) {
            setError('Veuillez sélectionner une matière')
            canProceed = false
          } else if (!level) {
            setError('Veuillez sélectionner un niveau')
            canProceed = false
          }
        }
        break
      case 2:
        const objectives = form.getValues('learning_objectives')
        const validObjectives = objectives.filter(obj => obj && obj.length >= 10)
        if (validObjectives.length < 1) {
          setError('Ajoutez au moins un objectif d\'apprentissage (minimum 10 caractères)')
          canProceed = false
        }
        break
      case 3:
        const courseTitle = form.getValues('first_course.title')
        const isFree = form.getValues('first_course.is_free')
        const price = form.getValues('first_course.price')
        
        if (!courseTitle || courseTitle.length < 5) {
          setError('Le titre du cours doit contenir au moins 5 caractères')
          canProceed = false
        } else if (!isFree && (!price || price <= 0)) {
          setError('Veuillez définir un prix pour le cours payant')
          canProceed = false
        }
        break
      case 4:
        break
    }

    if (canProceed && currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (currentStep === 1) {
      setMode(null)
      setCurrentStep(0)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const data = form.getValues()
      let classroomId: string

      if (mode === 'new') {
        // Create classroom first
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
        classroomId = classroom.id
        console.log('✅ Classroom created with ID:', classroomId)
      } else {
        classroomId = selectedClassId!
        console.log('✅ Using existing classroom ID:', classroomId)
      }

      // Clean duration values - convert NaN to null
      const cleanNumber = (val: any) => {
        if (val === undefined || val === null || val === '' || isNaN(val)) return null
        return Number(val)
      }

      // Get user currency to convert price to EUR
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      let priceInEUR = data.first_course.price || 0

      if (user && !data.first_course.is_free && data.first_course.price) {
        const { data: profile } = await supabase
          .from('users')
          .select('country')
          .eq('id', user.id)
          .single()

        if (profile?.country) {
          const paymentConfig = getPaymentConfig(profile.country)
          // Convert from local currency to EUR
          priceInEUR = data.first_course.price / paymentConfig.exchangeRate
        }
      }

      const courseResponse = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          title: data.first_course.title,
          subject: data.subject,
          level: data.level,
          description: data.first_course.description || '',
          learning_objectives: data.learning_objectives.filter(obj => obj && obj.length >= 10),
          prerequisites: data.prerequisites || [],
          duration_minutes: cleanNumber(data.first_course.duration_minutes),
          duration_hours: cleanNumber(data.first_course.duration_hours),
          duration_weeks: cleanNumber(data.first_course.duration_weeks),
          access_type: data.first_course.is_free ? 'free' : 'premium',
          price: data.first_course.is_free ? 0 : Math.round(priceInEUR * 100) / 100, // Round to 2 decimals
          is_published: false,
        })
      })

      if (!courseResponse.ok) {
        const errorData = await courseResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de la création du cours')
      }

      const course = await courseResponse.json()

      if (data.initial_content.content) {
        await fetch('/api/chapters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: course.id,
            title: 'Introduction',
            order_index: 0,
            initial_content: data.initial_content
          })
        })
      }

      router.push(`/teacher/classrooms/${classroomId}?success=created&first=${mode === 'new'}`)

    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = mode === 'existing' ? STEPS_EXISTING_CLASS : STEPS

  // Mode Selection Screen
  if (currentStep === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', borderRadius: '50%', transform: 'translate(30%, -30%)' }} />
          <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'white', marginBottom: '12px', textAlign: 'center' }}>✨ Créer du contenu pédagogique</h1>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
              Choisissez comment vous souhaitez organiser votre nouveau cours
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {/* New Class Card */}
            <button
              onClick={() => handleModeSelect('new')}
              style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', border: '2px solid #e5e7eb', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '20px' }}>🆕</div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Créer une nouvelle classe</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>Démarrez de zéro avec une nouvelle classe et créez votre premier cours.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6', fontWeight: '600', fontSize: '14px' }}>
                <span>Commencer</span><span>→</span>
              </div>
            </button>

            {/* Existing Class Card */}
            <button
              onClick={() => handleModeSelect('existing')}
              style={{ backgroundColor: 'white', borderRadius: '20px', padding: '32px', border: '2px solid #e5e7eb', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '20px' }}>📁</div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>Ajouter à une classe existante</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>Enrichissez une classe déjà créée avec un nouveau cours.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: '600', fontSize: '14px' }}>
                <span>Sélectionner une classe</span><span>→</span>
              </div>
            </button>
          </div>

          <div style={{ marginTop: '32px', padding: '20px', backgroundColor: 'rgba(139, 92, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>💡</span>
              <div>
                <p style={{ fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Comment organiser vos cours ?</p>
                <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
                  Une <strong>classe</strong> regroupe plusieurs cours sur un même thème. Chaque <strong>cours</strong> traite d'un sujet spécifique.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step Content Renderer
  const renderStep = () => {
    if (mode === 'existing' && currentStep === 1) {
      return (
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>📁</span>Sélectionnez une classe
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>Choisissez la classe à laquelle vous souhaitez ajouter un nouveau cours</p>

          {loadingClasses ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ width: '48px', height: '48px', border: '4px solid #e5e7eb', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ color: '#6b7280' }}>Chargement de vos classes...</p>
            </div>
          ) : existingClasses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#f9fafb', borderRadius: '16px', border: '2px dashed #e5e7eb' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📭</span>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>Vous n'avez pas encore de classe</p>
              <button onClick={() => { setMode('new'); setCurrentStep(1) }} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
                Créer ma première classe
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {existingClasses.map((classroom) => (
                <button
                  key={classroom.id}
                  onClick={() => handleClassSelect(classroom.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', backgroundColor: selectedClassId === classroom.id ? 'rgba(139, 92, 246, 0.05)' : 'white', border: `2px solid ${selectedClassId === classroom.id ? '#8b5cf6' : '#e5e7eb'}`, borderRadius: '16px', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                >
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${selectedClassId === classroom.id ? '#8b5cf6' : '#d1d5db'}`, backgroundColor: selectedClassId === classroom.id ? '#8b5cf6' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selectedClassId === classroom.id && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                  </div>
                  <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>🏫</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>{classroom.title}</h3>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>{classroom.subject} • {classroom.level}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#8b5cf6' }}>{classroom.enrolled_count || 0} élèves</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    switch (currentStep) {
      case 1: return <Step1ClassInfo form={form} />
      case 2: return <Step2Objectives form={form} />
      case 3: return <Step3FirstCourse form={form} />
      case 4: return <Step4Content form={form} />
      default: return null
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Progress Header */}
      <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #d946ef 100%)', padding: '24px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '500' }}>Étape {currentStep} sur {steps.length}</span>
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600' }}>{Math.round((currentStep / steps.length) * 100)}% complété</span>
          </div>
          <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '10px', marginBottom: '20px', overflow: 'hidden' }}>
            <div style={{ width: `${(currentStep / steps.length) * 100}%`, height: '100%', backgroundColor: 'white', borderRadius: '10px', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            {steps.map((step, index) => {
              const stepNumber = index + 1
              const isActive = stepNumber === currentStep
              const isCompleted = stepNumber < currentStep
              return (
                <div key={step.number} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: isActive ? 'white' : isCompleted ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    {isCompleted ? '✓' : step.icon}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: isActive ? '600' : '400', color: isActive ? 'white' : 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{step.shortLabel}</span>
                </div>
              )
            })}
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

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: mode === 'new' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', borderRadius: '20px', marginBottom: '16px' }}>
          <span>{mode === 'new' ? '🆕' : '📁'}</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: mode === 'new' ? '#8b5cf6' : '#10b981' }}>
            {mode === 'new' ? 'Nouvelle classe' : 'Classe existante'}
          </span>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '32px', marginBottom: '24px' }}>
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <button type="button" onClick={handlePrevious} disabled={isSubmitting} style={{ padding: '14px 28px', backgroundColor: 'white', color: '#374151', border: '2px solid #e5e7eb', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
            ← Précédent
          </button>

          {currentStep < steps.length ? (
            <button type="button" onClick={handleNext} disabled={isSubmitting} style={{ padding: '14px 28px', background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' }}>
              Continuer →
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={isSubmitting} style={{ padding: '14px 32px', background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: isSubmitting ? 'wait' : 'pointer', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isSubmitting ? (
                <><div style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />Création en cours...</>
              ) : (
                <>✅ {mode === 'new' ? 'Créer la classe' : 'Créer le cours'}</>
              )}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}