'use client'

import { useEffect, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { getPaymentConfig } from '@/lib/payment/config'

// Define the type inline to avoid import issues
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

interface Step3FirstCourseProps {
  form: UseFormReturn<ClassWizardData>
}

export function Step3FirstCourse({ form }: Step3FirstCourseProps) {
  const { register, watch, setValue, formState: { errors } } = form
  const isFree = watch('first_course.is_free')
  const title = watch('first_course.title') || ''
  const price = watch('first_course.price')

  const [userCurrency, setUserCurrency] = useState<string>('EUR')
  const [currencySymbol, setCurrencySymbol] = useState<string>('€')
  const [exchangeRate, setExchangeRate] = useState<number>(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserCurrency = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('country, currency')
          .eq('id', user.id)
          .single()

        if (profile?.country) {
          const paymentConfig = getPaymentConfig(profile.country)
          setUserCurrency(paymentConfig.currency)
          setCurrencySymbol(paymentConfig.currencySymbol)
          setExchangeRate(paymentConfig.exchangeRate)
        }
      }
      setLoading(false)
    }

    loadUserCurrency()
  }, [])

  const isReady = title.length >= 5

  // Calculate EUR price from local currency
  const priceInEUR = price && exchangeRate > 0 ? (price / exchangeRate).toFixed(2) : '0'

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: '700', color: '#111827', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px' }}>📚</span>
          Créer votre premier cours
        </h2>
        <p style={{ color: '#6b7280', fontSize: '15px', lineHeight: '1.6' }}>
          Chaque classe contient un ou plusieurs cours. Commençons par le premier !
        </p>
      </div>

      {/* Course Title */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '15px' }}>
          Titre du cours <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          {...register('first_course.title')}
          type="text"
          placeholder="Ex: Introduction au programme HGGSP"
          style={{
            width: '100%',
            padding: '14px 16px',
            border: `2px solid ${errors.first_course?.title ? '#fecaca' : '#e5e7eb'}`,
            borderRadius: '12px',
            fontSize: '15px',
            boxSizing: 'border-box',
            backgroundColor: errors.first_course?.title ? '#fef2f2' : 'white'
          }}
        />
        <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '6px' }}>
          Ce sera le premier contenu que verront vos élèves
        </p>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '15px' }}>
          Description courte
          <span style={{ fontWeight: '400', color: '#9ca3af', fontSize: '13px', marginLeft: '8px' }}>(optionnelle)</span>
        </label>
        <textarea
          {...register('first_course.description')}
          rows={3}
          placeholder="Décrivez brièvement ce que les élèves apprendront dans ce cours..."
          style={{
            width: '100%',
            padding: '14px 16px',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            fontSize: '15px',
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            minHeight: '100px'
          }}
        />
      </div>

      {/* Accessibility */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151', fontSize: '15px' }}>
          Accessibilité du cours
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setValue('first_course.is_free', true)}
            style={{
              padding: '20px',
              backgroundColor: isFree ? 'rgba(16, 185, 129, 0.08)' : 'white',
              border: `2px solid ${isFree ? '#10b981' : '#e5e7eb'}`,
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: isFree ? '#10b981' : '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isFree ? <span style={{ color: 'white', fontSize: '18px' }}>✓</span> : <span style={{ fontSize: '18px' }}>🆓</span>}
              </div>
              <span style={{ fontWeight: '600', fontSize: '16px', color: isFree ? '#10b981' : '#374151' }}>Gratuit</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Accessible à tous vos élèves inscrits</p>
          </button>

          <button
            type="button"
            onClick={() => setValue('first_course.is_free', false)}
            style={{
              padding: '20px',
              backgroundColor: !isFree ? 'rgba(139, 92, 246, 0.08)' : 'white',
              border: `2px solid ${!isFree ? '#8b5cf6' : '#e5e7eb'}`,
              borderRadius: '16px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: !isFree ? '#8b5cf6' : '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {!isFree ? <span style={{ color: 'white', fontSize: '18px' }}>✓</span> : <span style={{ fontSize: '18px' }}>💰</span>}
              </div>
              <span style={{ fontWeight: '600', fontSize: '16px', color: !isFree ? '#8b5cf6' : '#374151' }}>Payant</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '13px' }}>Nécessite un paiement pour y accéder</p>
          </button>
        </div>
      </div>

      {/* Price (only if paid) */}
      {!isFree && (
        <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: 'rgba(139, 92, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.1)' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '15px' }}>
            Prix du cours <span style={{ color: '#ef4444' }}>*</span>
          </label>

          {loading ? (
            <div style={{ padding: '14px', textAlign: 'center', color: '#9ca3af' }}>
              Chargement de votre devise...
            </div>
          ) : (
            <>
              <div style={{ position: 'relative', maxWidth: '200px' }}>
                <input
                  {...register('first_course.price', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step={userCurrency === 'XOF' || userCurrency === 'XAF' ? '25' : '0.5'}
                  placeholder={userCurrency === 'EUR' ? '30' : userCurrency === 'TND' ? '100' : userCurrency === 'XOF' ? '20000' : '30'}
                  style={{
                    width: '100%',
                    padding: '14px 80px 14px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '18px',
                    fontWeight: '600',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontWeight: '600' }}>
                  {currencySymbol}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                Le prix du cours que verra chaque élève dans votre région
              </p>

              {/* EUR Conversion Info */}
              {userCurrency !== 'EUR' && price && price > 0 && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '12px', color: '#617589', marginBottom: '4px' }}>
                    💡 Prix stocké en EUR (devise de base) :
                  </p>
                  <p style={{ fontSize: '16px', fontWeight: '600', color: '#111418' }}>
                    ≈ {priceInEUR} €
                  </p>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    Les étudiants verront le prix converti dans leur devise locale
                  </p>
                </div>
              )}

              {userCurrency !== 'EUR' && (
                <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>💳</span>
                  <p style={{ fontSize: '12px', color: '#2563eb', lineHeight: '1.4' }}>
                    Devise configurée dans vos <a href="/settings" style={{ color: '#2563eb', fontWeight: '600', textDecoration: 'underline' }}>paramètres</a> : {userCurrency}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Duration Section - OPTIONAL */}
      <div style={{ marginBottom: '24px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>⏱️</span>
          <label style={{ fontWeight: '600', color: '#374151', fontSize: '15px' }}>Durée du cours</label>
          <span style={{ padding: '2px 8px', backgroundColor: '#e5e7eb', borderRadius: '6px', fontSize: '11px', fontWeight: '500', color: '#6b7280' }}>OPTIONNEL</span>
        </div>
        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
          Remplissez les champs pertinents selon votre type de cours. Vous pouvez laisser ces champs vides.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#6b7280' }}>Durée (minutes)</label>
            <input
              {...register('first_course.duration_minutes', { valueAsNumber: true })}
              type="number"
              min="1"
              max="480"
              placeholder="Ex: 90"
              style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Pour un cours simple</p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#6b7280' }}>Volume horaire (heures)</label>
            <input
              {...register('first_course.duration_hours', { valueAsNumber: true })}
              type="number"
              min="1"
              max="500"
              placeholder="Ex: 36"
              style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Total heures de cours</p>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500', color: '#6b7280' }}>Durée (semaines)</label>
            <input
              {...register('first_course.duration_weeks', { valueAsNumber: true })}
              type="number"
              min="1"
              max="52"
              placeholder="Ex: 12"
              style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Pour une formation</p>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
          <strong>Exemples :</strong> Cours unique: 90 minutes • Formation structurée: 12 semaines + 36 heures
        </p>
      </div>

      {/* Ready indicator */}
      {isReady && (
        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>🎯</span>
          <div>
            <p style={{ fontWeight: '600', color: '#065f46', marginBottom: '4px' }}>Excellent !</p>
            <p style={{ color: '#047857', fontSize: '14px' }}>
              Vous êtes presque prêt. À l'étape suivante, vous ajouterez le premier contenu de ce cours.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}