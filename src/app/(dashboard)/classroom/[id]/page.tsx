'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getPaymentConfig, convertPrice, formatPrice } from '@/lib/payment/config'

interface Classroom {
  id: string
  title: string
  description: string
  subject: string
  level: string
  teacher_id: string
  created_at: string
}

interface Course {
  id: string
  title: string
  description: string
  price: number
  access_type: 'free' | 'premium'
  enrolled_count: number
  learning_objectives: string[]
  prerequisites: string[]
  chapters: Chapter[]
  classroom_id: string
  teacher_id: string
  is_published: boolean
}

interface Chapter {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  type: string
  order_index: number
}

interface Teacher {
  id: string
  display_name: string
  avatar_url?: string
}

export default function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [paymentConfig, setPaymentConfig] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          setCurrentUserId(user.id)

          // Load user payment config
          const { data: profile } = await supabase
            .from('users')
            .select('country, currency')
            .eq('id', user.id)
            .single()

          if (profile?.country) {
            const config = getPaymentConfig(profile.country)
            setPaymentConfig(config)
          } else {
            // Default to EUR
            setPaymentConfig(getPaymentConfig('FR'))
          }
        } else {
          // Not logged in, use default
          setPaymentConfig(getPaymentConfig('FR'))
        }

        // Get classroom
        const { data: classroomData, error: classroomError } = await supabase
          .from('classrooms')
          .select('*')
          .eq('id', id)
          .single()

        if (classroomError || !classroomData) {
          console.error('Classroom error:', classroomError)
          setLoading(false)
          return
        }

        setClassroom(classroomData)

        // Get teacher info
        if (classroomData.teacher_id) {
          const { data: teacherData } = await supabase
            .from('users')
            .select('id, display_name, avatar_url')
            .eq('id', classroomData.teacher_id)
            .single()

          if (teacherData) {
            setTeacher(teacherData)
          }
        }

        // Get courses with chapters
        const { data: coursesData } = await supabase
          .from('courses')
          .select(`
            id,
            title,
            description,
            price,
            access_type,
            enrolled_count,
            learning_objectives,
            prerequisites,
            classroom_id,
            teacher_id,
            is_published
          `)
          .eq('classroom_id', id)
          .order('created_at', { ascending: true })

        if (coursesData && coursesData.length > 0) {
          // Get chapters for all courses
          const courseIds = coursesData.map(c => c.id)
          const { data: chaptersData } = await supabase
            .from('chapters')
            .select('id, title, order_index, course_id')
            .in('course_id', courseIds)
            .order('order_index', { ascending: true })

          if (chaptersData && chaptersData.length > 0) {
            // Get lessons for all chapters
            const chapterIds = chaptersData.map(ch => ch.id)
            const { data: lessonsData } = await supabase
              .from('lessons')
              .select('id, title, type, order_index, chapter_id')
              .in('chapter_id', chapterIds)
              .order('order_index', { ascending: true })

            // Group lessons by chapter
            const lessonsByChapter = new Map<string, Lesson[]>()
            lessonsData?.forEach(lesson => {
              if (!lessonsByChapter.has(lesson.chapter_id)) {
                lessonsByChapter.set(lesson.chapter_id, [])
              }
              lessonsByChapter.get(lesson.chapter_id)!.push(lesson)
            })

            // Group chapters by course
            const chaptersByCourse = new Map<string, Chapter[]>()
            chaptersData.forEach(chapter => {
              if (!chaptersByCourse.has(chapter.course_id)) {
                chaptersByCourse.set(chapter.course_id, [])
              }
              chaptersByCourse.get(chapter.course_id)!.push({
                ...chapter,
                lessons: lessonsByChapter.get(chapter.id) || []
              })
            })

            // Combine courses with their chapters
            const coursesWithChapters = coursesData.map(course => ({
              ...course,
              chapters: chaptersByCourse.get(course.id) || []
            }))

            setCourses(coursesWithChapters)
          } else {
            setCourses(coursesData.map(c => ({ ...c, chapters: [] })))
          }
        }

        // Check enrollment per course
        if (user) {
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('course_id')
            .eq('student_id', user.id)
            .eq('classroom_id', id)
            .not('course_id', 'is', null)

          const enrolledIds = new Set<string>()
          enrollments?.forEach(e => {
            if (e.course_id) enrolledIds.add(e.course_id)
          })
          setEnrolledCourseIds(enrolledIds)
        }

      } catch (error) {
        console.error('Error fetching data:', error)
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getSubjectStyle = (subject: string) => {
    const styles: { [key: string]: { bg: string, text: string, icon: string, gradient: string } } = {
      'Mathématiques': { bg: '#dbeafe', text: '#2563eb', icon: '📐', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
      'Physique': { bg: '#fef3c7', text: '#d97706', icon: '⚡', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
      'Chimie': { bg: '#fce7f3', text: '#db2777', icon: '🧪', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
      'Français': { bg: '#f3e8ff', text: '#9333ea', icon: '📝', gradient: 'linear-gradient(135deg, #a855f7, #9333ea)' },
      'Anglais': { bg: '#e0e7ff', text: '#4f46e5', icon: '🌍', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)' },
      'Histoire-Géo': { bg: '#ffedd5', text: '#ea580c', icon: '🗺️', gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
      'SVT': { bg: '#d1fae5', text: '#059669', icon: '🌱', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
      'Informatique': { bg: '#cffafe', text: '#0891b2', icon: '💻', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    }
    return styles[subject] || { bg: '#f3f4f6', text: '#6b7280', icon: '📚', gradient: 'linear-gradient(135deg, #6b7280, #4b5563)' }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    )
  }

  if (!classroom) {
    return (
      <div style={{ textAlign: 'center', padding: '64px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>Classe non trouvée</h2>
        <p style={{ color: '#617589', marginBottom: '24px' }}>Cette classe n'existe pas ou a été supprimée.</p>
        <Link href="/search" style={{ color: '#2b8cee', fontWeight: '600', textDecoration: 'none' }}>
          Retour à la recherche →
        </Link>
      </div>
    )
  }

  const style = getSubjectStyle(classroom.subject)
  const totalLessons = courses.reduce((sum, course) =>
    sum + course.chapters.reduce((chSum, ch) => chSum + ch.lessons.length, 0), 0
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Link */}
      <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#617589', textDecoration: 'none', marginBottom: '24px', fontSize: '14px' }}>
        ← Retour à la recherche
      </Link>

      {/* Header Card */}
      <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ height: '160px', background: style.gradient, padding: '24px', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
              {style.icon}
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{classroom.subject} • {classroom.level}</span>
              <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}>{classroom.title}</h1>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          <p style={{ color: '#617589', lineHeight: '1.7', marginBottom: '24px' }}>
            {classroom.description || 'Aucune description disponible.'}
          </p>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📚</span>
              <span style={{ color: '#111418', fontWeight: '600' }}>{courses.length} cours</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📖</span>
              <span style={{ color: '#111418', fontWeight: '600' }}>{courses.reduce((sum, c) => sum + c.chapters.length, 0)} chapitres</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📝</span>
              <span style={{ color: '#111418', fontWeight: '600' }}>{totalLessons} leçons</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        {/* Main Content - Courses List */}
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', marginBottom: '16px' }}>
            Cours disponibles ({courses.length})
          </h2>

          {courses.length === 0 ? (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '48px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📚</div>
              <p style={{ color: '#617589' }}>Aucun cours disponible pour le moment</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {courses.map((course, index) => {
                const isEnrolled = enrolledCourseIds.has(course.id)
                const isFree = course.access_type === 'free' || course.price === 0
                const priceInUserCurrency = paymentConfig ? convertPrice(course.price, paymentConfig) : course.price
                const formattedPrice = paymentConfig ? formatPrice(priceInUserCurrency, paymentConfig) : `${course.price}€`

                return (
                  <div key={course.id} style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
                    <div style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ padding: '4px 12px', backgroundColor: style.bg, color: style.text, borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                              Cours {index + 1}
                            </span>
                            {isEnrolled && (
                              <span style={{ padding: '4px 12px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>
                                ✓ Inscrit
                              </span>
                            )}
                          </div>
                          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>
                            {course.title}
                          </h3>
                          <p style={{ color: '#617589', fontSize: '14px', lineHeight: '1.6' }}>
                            {course.description || 'Aucune description disponible'}
                          </p>
                        </div>

                        <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: isFree ? '#16a34a' : '#111418', marginBottom: '4px' }}>
                            {isFree ? 'Gratuit' : formattedPrice}
                          </div>
                          {!isFree && paymentConfig?.currency !== 'EUR' && (
                            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                              ≈ {course.price.toFixed(2)} €
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Course Stats */}
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#617589' }}>
                          <span>📖</span>
                          <span>{course.chapters.length} chapitres</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#617589' }}>
                          <span>📝</span>
                          <span>{course.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)} leçons</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#617589' }}>
                          <span>👥</span>
                          <span>{course.enrolled_count || 0} élèves</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      {isEnrolled ? (
                        <Link
                          href={`/course/${course.id}`}
                          style={{ display: 'block', width: '100%', padding: '12px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', textAlign: 'center', fontSize: '14px' }}
                        >
                          Accéder au cours →
                        </Link>
                      ) : currentUserId === classroom.teacher_id ? (
                        <Link
                          href={`/teacher/courses/${course.id}`}
                          style={{ display: 'block', width: '100%', padding: '12px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', textAlign: 'center', fontSize: '14px' }}
                        >
                          Gérer ce cours
                        </Link>
                      ) : !currentUserId ? (
                        <Link
                          href="/login"
                          style={{ display: 'block', width: '100%', padding: '12px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', textAlign: 'center', fontSize: '14px' }}
                        >
                          Se connecter pour s'inscrire
                        </Link>
                      ) : isFree ? (
                        <Link
                          href={`/checkout?course=${course.id}`}
                          style={{ display: 'block', width: '100%', padding: '12px', backgroundColor: '#16a34a', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', textAlign: 'center', fontSize: '14px' }}
                        >
                          🎉 S'inscrire gratuitement
                        </Link>
                      ) : (
                        <Link
                          href={`/checkout?course=${course.id}`}
                          style={{ display: 'block', width: '100%', padding: '12px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', textAlign: '14px' }}
                        >
                          💳 Acheter ce cours - {formattedPrice}
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Teacher Card */}
          {teacher && (
            <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '24px', position: 'sticky', top: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111418', marginBottom: '16px' }}>Votre professeur</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#2b8cee', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                  {getInitials(teacher.display_name)}
                </div>
                <div>
                  <p style={{ fontWeight: 'bold', color: '#111418' }}>{teacher.display_name}</p>
                  <p style={{ color: '#617589', fontSize: '14px' }}>{classroom.subject}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ flex: 1, padding: '10px', border: '1px solid #dbe0e6', borderRadius: '8px', backgroundColor: 'white', color: '#111418', fontWeight: '500', cursor: 'pointer', fontSize: '13px' }}>
                  Voir le profil
                </button>
                <button style={{ flex: 1, padding: '10px', backgroundColor: '#2b8cee', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '500', cursor: 'pointer', fontSize: '13px' }}>
                  💬 Message
                </button>
              </div>
            </div>
          )}

          {/* What's included */}
          <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111418', marginBottom: '16px' }}>Ce qui est inclus</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: '✓', text: 'Accès aux cours achetés' },
                { icon: '✓', text: 'Chapitres et leçons' },
                { icon: '✓', text: 'QCM et évaluations' },
                { icon: '✓', text: 'Support du professeur' },
                { icon: '✓', text: 'Certificat de complétion' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '14px' }}>{item.icon}</span>
                  <span style={{ fontSize: '13px', color: '#617589' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
