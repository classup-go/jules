'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useGeoLocation } from '@/lib/payment/useGeoLocation'
import { convertPrice, formatPrice, PaymentMethod, getPaymentConfig } from '@/lib/payment/config'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const courseId = searchParams.get('course')
  const classroomId = searchParams.get('classroom') // Backward compatibility

  const { countryCode: detectedCountry, countryName, loading: geoLoading, paymentConfig: detectedPaymentConfig } = useGeoLocation()

  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [error, setError] = useState<string | null>(null)

  // User preferences from database
  const [userCountry, setUserCountry] = useState<string | null>(null)
  const [userCurrency, setUserCurrency] = useState<string | null>(null)
  const [paymentConfig, setPaymentConfig] = useState<any>(null)

  // Prix converti
  const [localPrice, setLocalPrice] = useState<number>(0)

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId && !classroomId) {
        router.push('/search')
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)
      setUserEmail(user.email || '')

      // Load user preferences from database
      const { data: userData } = await supabase
        .from('users')
        .select('country, currency')
        .eq('id', user.id)
        .single()

      if (userData?.country && userData?.currency) {
        // Use saved preferences
        setUserCountry(userData.country)
        setUserCurrency(userData.currency)
        setPaymentConfig(getPaymentConfig(userData.country))
      } else if (!geoLoading && detectedCountry) {
        // Fallback to geo-detection
        setUserCountry(detectedCountry)
        setPaymentConfig(detectedPaymentConfig)
      }

      // Prioritize course-level checkout
      if (courseId) {
        // Check if already enrolled in this course
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('student_id', user.id)
          .single()

        if (enrollment) {
          router.push(`/course/${courseId}`)
          return
        }

        // Get course with classroom and teacher
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select(`
            *,
            classrooms!inner (
              id,
              title,
              teacher_id,
              users!classrooms_teacher_id_fkey (
                id,
                display_name
              )
            )
          `)
          .eq('id', courseId)
          .single()

        if (courseError) {
          console.error('Error fetching course:', courseError)
        }

        if (courseData) {
          // Si cours gratuit, créer enrollment et rediriger
          if (courseData.access_type === 'free' || courseData.price === 0) {
            const { error: enrollError, data: enrollData } = await supabase
              .from('enrollments')
              .insert({
                course_id: courseId,
                classroom_id: courseData.classroom_id,
                student_id: user.id,
              })
              .select()
              .single()

            if (enrollError) {
              console.error('Free enrollment error:', enrollError)
              if (enrollError.code === '23505') {
                router.push(`/payment/success?course_id=${courseId}&free=true`)
                return
              } else {
                router.push(`/course/${courseId}?error=enrollment_failed`)
                return
              }
            }

            // Update enrolled count (will be handled by trigger)
            router.push(`/payment/success?course_id=${courseId}&free=true`)
            return
          }

          // Transform data structure for compatibility
          const transformedCourse = {
            ...courseData,
            classroom: {
              id: courseData.classrooms?.id,
              title: courseData.classrooms?.title,
            },
            teacher: {
              id: courseData.classrooms?.users?.id,
              display_name: courseData.classrooms?.users?.display_name,
            },
            teacher_id: courseData.classrooms?.teacher_id,
          }

          setCourse(transformedCourse)
        }
      } else if (classroomId) {
        // Backward compatibility: classroom-level checkout
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('id')
          .eq('classroom_id', classroomId)
          .eq('student_id', user.id)
          .single()

        if (enrollment) {
          router.push(`/classroom/${classroomId}`)
          return
        }

        const { data: classroomData } = await supabase
          .from('classrooms')
          .select('*, teacher:users(id, display_name)')
          .eq('id', classroomId)
          .single()

        if (classroomData) {
          if (classroomData.is_free || classroomData.price === 0) {
            const { error: enrollError } = await supabase
              .from('enrollments')
              .insert({
                classroom_id: classroomId,
                student_id: user.id,
              })
              .select()
              .single()

            if (enrollError && enrollError.code !== '23505') {
              router.push(`/classroom/${classroomId}?error=enrollment_failed`)
              return
            }

            router.push(`/payment/success?classroom_id=${classroomId}&free=true`)
            return
          }

          // Convert classroom format to course format for compatibility
          setCourse({
            id: classroomData.id,
            title: classroomData.title,
            description: classroomData.description,
            price: classroomData.price,
            subject: classroomData.subject,
            level: classroomData.level,
            teacher: classroomData.teacher,
            teacher_id: classroomData.teacher_id,
            classroom_id: classroomData.id,
            _isClassroom: true
          })
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [courseId, classroomId, router])

  // Fallback to geo-detection if no user preferences
  useEffect(() => {
    if (!geoLoading && !userCountry && detectedCountry && detectedPaymentConfig) {
      setUserCountry(detectedCountry)
      setPaymentConfig(detectedPaymentConfig)
    }
  }, [geoLoading, detectedCountry, detectedPaymentConfig, userCountry])

  // Convertir le prix quand la config change
  useEffect(() => {
    if (course && paymentConfig && course.price > 0) {
      const converted = convertPrice(course.price, paymentConfig)
      setLocalPrice(converted)

      // Sélectionner la première méthode par défaut
      if (paymentConfig.paymentMethods.length > 0 && !selectedMethod) {
        setSelectedMethod(paymentConfig.paymentMethods[0])
      }
    }
  }, [course, paymentConfig, selectedMethod])

  const handlePayment = async () => {
    if (!selectedMethod || !userId || !course) return

    setProcessing(true)
    setError(null)

    try {
      // Call Stripe checkout API
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: courseId || null,
          classroomId: course._isClassroom ? course.classroom_id : null,
          currency: paymentConfig.currency,
          exchangeRate: paymentConfig.exchangeRate,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Checkout error:', data)
        setError(data.error || 'Erreur lors du paiement')
        setProcessing(false)
        return
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      } else {
        setError('URL de paiement manquante')
        setProcessing(false)
      }
    } catch (err) {
      console.error('Payment error:', err)
      setError('Une erreur est survenue')
      setProcessing(false)
    }
  }

  const getRegionFlag = (code: string) => {
    const flags: Record<string, string> = {
      TN: '🇹🇳', FR: '🇫🇷', SN: '🇸🇳', CI: '🇨🇮', ML: '🇲🇱', 
      BF: '🇧🇫', BJ: '🇧🇯', TG: '🇹🇬', CM: '🇨🇲', GA: '🇬🇦',
      DE: '🇩🇪', BE: '🇧🇪', US: '🇺🇸', GB: '🇬🇧',
    }
    return flags[code] || '🌍'
  }

  const getSubjectStyle = (subject: string) => {
    const styles: { [key: string]: { bg: string, icon: string } } = {
      'Mathématiques': { bg: '#dbeafe', icon: '📐' },
      'Physique': { bg: '#fef3c7', icon: '⚡' },
      'Chimie': { bg: '#fce7f3', icon: '🧪' },
      'Français': { bg: '#f3e8ff', icon: '📝' },
      'Anglais': { bg: '#e0e7ff', icon: '🌍' },
      'Histoire-Géo': { bg: '#ffedd5', icon: '🗺️' },
      'SVT': { bg: '#d1fae5', icon: '🌱' },
      'Informatique': { bg: '#cffafe', icon: '💻' },
    }
    return styles[subject] || { bg: '#f3f4f6', icon: '📚' }
  }

  // Calculer le total avec frais
  const fees = selectedMethod ? localPrice * selectedMethod.fees / 100 : 0
  const total = localPrice + fees

  if (loading || geoLoading || !paymentConfig) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #dbe0e6', borderTopColor: '#2b8cee', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: '#617589' }}>Chargement...</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <h2 style={{ marginBottom: '16px' }}>Cours non trouvé</h2>
        <Link href="/search" style={{ color: '#2b8cee' }}>Retour à la recherche</Link>
      </div>
    )
  }

  const subjectStyle = getSubjectStyle(course.subject || 'Autre')
  const displayCountry = userCountry || detectedCountry
  const displayCountryName = userCountry ? (
    // Get country name from COUNTRIES list
    (() => {
      const countries: Record<string, string> = {
        FR: 'France', DE: 'Allemagne', ES: 'Espagne', IT: 'Italie',
        TN: 'Tunisie', MA: 'Maroc', SN: 'Sénégal', CI: "Côte d'Ivoire",
        US: 'États-Unis', CA: 'Canada', GB: 'Royaume-Uni'
      }
      return countries[userCountry] || userCountry
    })()
  ) : countryName

  const backLink = courseId ? `/classroom/${course.classroom_id}` : `/classroom/${classroomId}`

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Link href={backLink} style={{ color: '#617589', textDecoration: 'none', fontSize: '14px', marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        ← Retour au cours
      </Link>

      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>Finaliser l'inscription</h1>

      {/* Location Badge */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '32px', padding: '8px 16px', backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6' }}>
        <span style={{ fontSize: '18px' }}>{getRegionFlag(displayCountry)}</span>
        <span style={{ color: '#617589', fontSize: '14px' }}>
          {displayCountryName} • Paiement en <strong style={{ color: '#111418' }}>{paymentConfig.currency}</strong>
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '32px' }}>
        {/* Left Column */}
        <div>
          {/* Order Summary */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111418', marginBottom: '20px' }}>Récapitulatif</h2>
            
            <div style={{ display: 'flex', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '12px', backgroundColor: subjectStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                {subjectStyle.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: '600', color: '#111418', marginBottom: '4px', fontSize: '16px' }}>{course.title}</h3>
                {course.subject && <p style={{ fontSize: '14px', color: '#617589', marginBottom: '4px' }}>{course.subject} {course.level ? `• ${course.level}` : ''}</p>}
                <p style={{ fontSize: '14px', color: '#617589' }}>Par {course.teacher?.display_name || 'Professeur'}</p>
              </div>
            </div>

            <div style={{ paddingTop: '20px' }}>
              {/* Prix original en EUR */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#617589' }}>Prix du cours</span>
                <span style={{ fontWeight: '500', color: '#111418' }}>{course.price}€</span>
              </div>

              {/* Prix converti si différent */}
              {paymentConfig.currency !== 'EUR' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#617589' }}>Converti en {paymentConfig.currency}</span>
                  <span style={{ fontWeight: '500', color: '#111418' }}>{formatPrice(localPrice, paymentConfig)}</span>
                </div>
              )}

              {/* Frais */}
              {selectedMethod && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: '#617589' }}>Frais de transaction ({selectedMethod.fees}%)</span>
                  <span style={{ fontWeight: '500', color: '#111418' }}>
                    {formatPrice(fees, paymentConfig)}
                  </span>
                </div>
              )}

              <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '16px 0' }}></div>
              
              {/* Total */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: '#111418', fontSize: '16px' }}>Total à payer</span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#2b8cee' }}>
                  {formatPrice(total, paymentConfig)}
                </span>
              </div>
            </div>
          </div>

          {/* What's included */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111418', marginBottom: '16px' }}>Ce qui est inclus</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { icon: '✓', text: 'Accès illimité au contenu du cours' },
                { icon: '✓', text: 'Tous les chapitres et leçons' },
                { icon: '✓', text: 'QCM et évaluations' },
                { icon: '✓', text: 'Support du professeur' },
                { icon: '✓', text: 'Certificat de complétion' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{item.icon}</span>
                  <span style={{ fontSize: '14px', color: '#617589' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Payment Methods */}
        <div>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111418', marginBottom: '20px' }}>
              Méthode de paiement
            </h2>

            {/* Payment Methods */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {paymentConfig.paymentMethods.map((method: any) => (
                <label
                  key={method.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    borderRadius: '12px',
                    border: selectedMethod?.id === method.id ? '2px solid #2b8cee' : '2px solid #dbe0e6',
                    backgroundColor: selectedMethod?.id === method.id ? 'rgba(43, 140, 238, 0.05)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={selectedMethod?.id === method.id}
                    onChange={() => setSelectedMethod(method)}
                    style={{ width: '20px', height: '20px', accentColor: '#2b8cee' }}
                  />
                  <span style={{ fontSize: '24px' }}>{method.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', color: '#111418', marginBottom: '2px' }}>{method.name}</p>
                    <p style={{ fontSize: '13px', color: '#617589' }}>{method.description}</p>
                  </div>
                  <span style={{ fontSize: '12px', color: '#617589', backgroundColor: '#f3f4f6', padding: '4px 10px', borderRadius: '6px', fontWeight: '500' }}>
                    {method.fees}%
                  </span>
                </label>
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ color: '#dc2626', fontSize: '14px' }}>⚠️ {error}</p>
              </div>
            )}

            {/* Enroll Button */}
            <button
              onClick={handlePayment}
              disabled={processing || !selectedMethod}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: processing || !selectedMethod ? '#dbe0e6' : '#2b8cee',
                color: processing || !selectedMethod ? '#9ca3af' : 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: processing || !selectedMethod ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {processing ? (
                <>
                  <span style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                  Inscription en cours...
                </>
              ) : (
                <>✓ Confirmer l'inscription - {formatPrice(total, paymentConfig)}</>
              )}
            </button>

            <p style={{ fontSize: '12px', color: '#617589', textAlign: 'center', marginTop: '16px' }}>
              Paiement sécurisé. Vos données sont protégées.
            </p>

            {/* Regional Info */}
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
              <p style={{ fontSize: '12px', color: '#617589', textAlign: 'center' }}>
                {paymentConfig.region === 'tunisia' && '🇹🇳 Paiement via les solutions tunisiennes Konnect, Flouci ou D17'}
                {paymentConfig.region === 'africa_fcfa' && '🌍 Paiement via CinetPay, Orange Money, Wave ou MTN Money'}
                {paymentConfig.region === 'europe' && '🇪🇺 Paiement sécurisé par Stripe'}
                {paymentConfig.region === 'international' && '🌐 Paiement international par Stripe'}
              </p>
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: '#617589', display: 'flex', alignItems: 'center', gap: '4px' }}>🔒 SSL</span>
            <span style={{ fontSize: '12px', color: '#617589', display: 'flex', alignItems: 'center', gap: '4px' }}>✓ Remboursement</span>
            <span style={{ fontSize: '12px', color: '#617589', display: 'flex', alignItems: 'center', gap: '4px' }}>💬 Support</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #dbe0e6', borderTopColor: '#2b8cee', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: '#617589' }}>Chargement...</p>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}