'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Classroom {
  id: string
  title: string
  description: string
  subject: string
  level: string
  price: number
  is_free: boolean
  enrolled_count: number
  created_at: string
  teacher_id: string
}

interface Teacher {
  id: string
  display_name: string
  avatar_url?: string
}

interface TeacherProfile {
  rating: number
  total_reviews: number
  hourly_rate: number
  subjects: string[]
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
  description?: string
  order_index: number
}

export default function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          setCurrentUserId(user.id)
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

        // Get teacher info (profile data is now in users table)
        if (classroomData.teacher_id) {
          try {
            const { data: teacherData } = await supabase
              .from('users')
              .select('id, display_name, avatar_url, rating, total_reviews, hourly_rate, subjects')
              .eq('id', classroomData.teacher_id)
              .single()

            if (teacherData) {
              // Set basic teacher info
              setTeacher({
                id: teacherData.id,
                display_name: teacherData.display_name,
                avatar_url: teacherData.avatar_url
              })

              // Set teacher profile from users table
              setTeacherProfile({
                rating: teacherData.rating || 0,
                total_reviews: teacherData.total_reviews || 0,
                hourly_rate: teacherData.hourly_rate || 0,
                subjects: teacherData.subjects || []
              })
            }
          } catch (e) {
            console.log('Teacher fetch error:', e)
          }
        }

        // Check enrollment
        if (user) {
          try {
            const { data: enrollment } = await supabase
              .from('enrollments')
              .select('id')
              .eq('classroom_id', id)
              .eq('student_id', user.id)
              .maybeSingle()

            setIsEnrolled(!!enrollment)
          } catch (e) {
            console.log('Enrollment check error:', e)
          }
        }

        // Get chapters with lessons
        try {
          const { data: chaptersData } = await supabase
            .from('chapters')
            .select('id, title, order_index')
            .eq('classroom_id', id)
            .order('order_index', { ascending: true })

          if (chaptersData && chaptersData.length > 0) {
            // Get all lessons for these chapters
            const chapterIds = chaptersData.map(c => c.id)
            
            const { data: lessonsData } = await supabase
              .from('lessons')
              .select('id, title, type, description, order_index, chapter_id')
              .in('chapter_id', chapterIds)
              .order('order_index', { ascending: true })

            // Group lessons by chapter
            const lessonsMap = new Map<string, Lesson[]>()
            lessonsData?.forEach(lesson => {
              if (!lessonsMap.has(lesson.chapter_id)) {
                lessonsMap.set(lesson.chapter_id, [])
              }
              lessonsMap.get(lesson.chapter_id)!.push(lesson)
            })

            // Combine chapters with their lessons
            const chaptersWithLessons = chaptersData.map(chapter => ({
              ...chapter,
              lessons: lessonsMap.get(chapter.id) || []
            }))

            setChapters(chaptersWithLessons)
          }
        } catch (e) {
          console.log('Chapters fetch error:', e)
        }

      } catch (error) {
        console.error('Error fetching data:', error)
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  const handleEnroll = async () => {
    if (!currentUserId) {
      router.push('/login')
      return
    }

    setEnrolling(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('enrollments')
      .insert({
        classroom_id: id,
        student_id: currentUserId
      })

    if (!error) {
      await supabase
        .from('classrooms')
        .update({ enrolled_count: (classroom?.enrolled_count || 0) + 1 })
        .eq('id', id)

      setIsEnrolled(true)
      setClassroom(prev => prev ? { ...prev, enrolled_count: (prev.enrolled_count || 0) + 1 } : null)
    } else {
      console.error('Enrollment error:', error)
    }

    setEnrolling(false)
  }

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄'
      case 'video': return '🎥'
      case 'qcm': return '✅'
      case 'text': return '📝'
      default: return '📚'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'pdf': return 'Document PDF'
      case 'video': return 'Vidéo'
      case 'qcm': return 'Quiz'
      case 'text': return 'Texte'
      default: return 'Contenu'
    }
  }

  // Count total lessons
  const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0)

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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Link */}
      <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#617589', textDecoration: 'none', marginBottom: '24px', fontSize: '14px' }}>
        ← Retour à la recherche
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        {/* Main Content */}
        <div>
          {/* Header Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6', overflow: 'hidden', marginBottom: '24px' }}>
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
                  <span style={{ fontSize: '20px' }}>👥</span>
                  <span style={{ color: '#111418', fontWeight: '600' }}>{classroom.enrolled_count || 0} élèves</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📖</span>
                  <span style={{ color: '#111418', fontWeight: '600' }}>{chapters.length} chapitres</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📚</span>
                  <span style={{ color: '#111418', fontWeight: '600' }}>{totalLessons} leçons</span>
                </div>
              </div>
            </div>
          </div>

          {/* Course Content - Chapters & Lessons */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418' }}>Programme du cours</h2>
            </div>

            {chapters.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📂</div>
                <p style={{ color: '#617589' }}>Aucun contenu disponible pour le moment</p>
              </div>
            ) : (
              <div>
                {chapters.map((chapter, chapterIndex) => (
                  <div key={chapter.id} style={{ borderBottom: chapterIndex < chapters.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    {/* Chapter Header */}
                    <div style={{ padding: '16px 24px', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: style.text, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                        {chapterIndex + 1}
                      </div>
                      <div>
                        <h3 style={{ fontWeight: '600', color: '#111418' }}>{chapter.title}</h3>
                        <p style={{ fontSize: '13px', color: '#617589' }}>{chapter.lessons.length} leçon{chapter.lessons.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* Lessons */}
                    {chapter.lessons.map((lesson, lessonIndex) => (
                      <div
                        key={lesson.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 24px 14px 72px',
                          borderTop: '1px solid #f3f4f6',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                            {getTypeIcon(lesson.type)}
                          </div>
                          <div>
                            <p style={{ fontWeight: '500', color: '#111418', fontSize: '14px' }}>{lesson.title}</p>
                            <p style={{ fontSize: '12px', color: '#617589' }}>{getTypeLabel(lesson.type)}</p>
                          </div>
                        </div>
                        {isEnrolled ? (
                          <Link href={`/lesson/${lesson.id}`} style={{ padding: '6px 14px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>
                            Accéder
                          </Link>
                        ) : (
                          <span style={{ padding: '6px 14px', backgroundColor: '#f3f4f6', color: '#9ca3af', borderRadius: '6px', fontSize: '13px' }}>
                            🔒
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Price Card */}
          <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6', padding: '24px', position: 'sticky', top: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', color: '#617589', marginBottom: '4px' }}>Prix du cours</p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: (classroom.is_free || classroom.price === 0) ? '#16a34a' : '#111418' }}>
                {(classroom.is_free || classroom.price === 0) ? 'Gratuit' : `${classroom.price}€`}
              </p>
            </div>

            {isEnrolled ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ padding: '16px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', marginBottom: '16px' }}>
                  <span style={{ color: '#16a34a', fontWeight: '600' }}>✅ Vous êtes inscrit</span>
                </div>
                <Link href="/student/my-courses" style={{ color: '#2b8cee', fontWeight: '500', textDecoration: 'none' }}>
                  Voir mes cours →
                </Link>
              </div>
            ) : currentUserId === classroom.teacher_id ? (
              <Link href={`/teacher/classrooms/${classroom.id}`} style={{ display: 'block', padding: '14px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: '600', textAlign: 'center' }}>
                Gérer cette classe
              </Link>
            ) : !currentUserId ? (
              <Link href="/login" style={{ display: 'block', padding: '16px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '12px', fontWeight: '600', textDecoration: 'none', textAlign: 'center' }}>
                Se connecter pour s'inscrire
              </Link>
            ) : (classroom.is_free || classroom.price === 0) ? (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                style={{ width: '100%', padding: '16px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', fontSize: '16px', cursor: enrolling ? 'not-allowed' : 'pointer', opacity: enrolling ? 0.7 : 1 }}
              >
                {enrolling ? 'Inscription...' : "🎉 S'inscrire gratuitement"}
              </button>
            ) : (
              <Link href={`/checkout?classroom=${classroom.id}`} style={{ display: 'block', padding: '16px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '12px', fontWeight: '600', textDecoration: 'none', textAlign: 'center' }}>
                💳 S'inscrire pour {classroom.price}€
              </Link>
            )}

            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f3f4f6' }}>
              {[
                'Accès illimité au contenu',
                'Support du professeur',
                'Certificat de complétion'
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#617589', marginBottom: i < 2 ? '10px' : 0 }}>
                  <span style={{ color: '#16a34a' }}>✓</span> {item}
                </div>
              ))}
            </div>
          </div>

          {/* Teacher Card */}
          {teacher && (
            <div style={{ backgroundColor: 'white', borderRadius: '20px', border: '1px solid #dbe0e6', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111418', marginBottom: '20px' }}>Votre professeur</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#2b8cee', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                  {getInitials(teacher.display_name)}
                </div>
                <div>
                  <p style={{ fontWeight: 'bold', color: '#111418' }}>{teacher.display_name}</p>
                  <p style={{ color: '#617589', fontSize: '14px' }}>{classroom.subject}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={{ flex: 1, padding: '10px', border: '1px solid #dbe0e6', borderRadius: '8px', backgroundColor: 'white', color: '#111418', fontWeight: '500', cursor: 'pointer', fontSize: '13px' }}>
                  Voir le profil
                </button>
                <button style={{ flex: 1, padding: '10px', backgroundColor: '#2b8cee', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '500', cursor: 'pointer', fontSize: '13px' }}>
                  💬 Message
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}