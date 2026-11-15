'use client'

import { useState, useEffect, use, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Classroom {
  id: string
  title: string
  description: string
  subject: string
  level: string
  price: number
  is_free: boolean
  course_type: string
  progression_type: string
  enrolled_count: number
  is_public: boolean
}

interface Course {
  id: string
  title: string
  description: string
  price: number
  access_type: string
  is_published: boolean
  enrolled_count: number
  created_at: string
}

interface Chapter {
  id: string
  title: string
  description: string
  order_index: number
  required_score: number
  lessons: Lesson[]
}

interface Lesson {
  id: string
  title: string
  type: string
  duration_minutes: number
  order_index: number
  is_free: boolean
  is_chapter_validation: boolean
}

interface Student {
  id: string
  display_name: string
  email: string
  enrolled_at: string
  enrollment_id: string
}

interface AvailableStudent {
  id: string
  display_name: string
  email: string
  avatar_url?: string
}

function ClassroomDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'content' | 'students' | 'settings'>('content')
  const [showAddChapter, setShowAddChapter] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [editingScore, setEditingScore] = useState(75)
  const [actualEnrolledCount, setActualEnrolledCount] = useState(0)
  const [totalEarnings, setTotalEarnings] = useState(0)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [enrollmentLoading, setEnrollmentLoading] = useState(false)

  // URL params
  const showSuccess = searchParams.get('success') === 'true'
  const isFirstTime = searchParams.get('firstTime') === 'true'
  const courseCreated = searchParams.get('courseCreated') === 'true'

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    const supabase = createClient()

    // Get classroom data
    const { data: classroomData } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', id)
      .single()

    if (classroomData) setClassroom(classroomData)

    // Get courses in this classroom
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*')
      .eq('classroom_id', id)
      .order('created_at', { ascending: false })

    if (coursesData) {
      setCourses(coursesData)
    }

    // Get chapters with lessons
    const { data: chaptersData } = await supabase
      .from('chapters')
      .select(`
        *,
        lessons (*)
      `)
      .eq('classroom_id', id)
      .order('order_index', { ascending: true })

    if (chaptersData) {
      setChapters(chaptersData.map(ch => ({
        ...ch,
        required_score: ch.required_score || 75,
        lessons: ch.lessons?.sort((a: any, b: any) => a.order_index - b.order_index) || []
      })))
    }

    // Get actual enrollments count and student list (only active)
    const { data: enrollmentsData } = await supabase
      .from('enrollments')
      .select('id, student_id, created_at, enrolled_at')
      .eq('classroom_id', id)
      .eq('status', 'active')

    const enrolledCount = enrollmentsData?.length || 0
    setActualEnrolledCount(enrolledCount)

    // Calculate earnings
    if (classroomData && !classroomData.is_free) {
      setTotalEarnings(enrolledCount * (classroomData.price || 0))
    }

    // Update enrolled_count in database if different
    if (classroomData && classroomData.enrolled_count !== enrolledCount) {
      await supabase
        .from('classrooms')
        .update({ enrolled_count: enrolledCount })
        .eq('id', id)
    }

    // Get student details
    if (enrollmentsData && enrollmentsData.length > 0) {
      const studentIds = enrollmentsData.map(e => e.student_id)

      const { data: studentsData } = await supabase
        .from('users')
        .select('id, display_name, email')
        .in('id', studentIds)

      if (studentsData) {
        const enrichedStudents = studentsData.map(student => {
          const enrollment = enrollmentsData.find(e => e.student_id === student.id)
          return {
            ...student,
            enrolled_at: enrollment?.enrolled_at || enrollment?.created_at || '',
            enrollment_id: enrollment?.id || ''
          }
        }).sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime())

        setStudents(enrichedStudents)
      }
    } else {
      setStudents([])
    }

    setLoading(false)
  }

  const addChapter = async () => {
    if (!newChapterTitle.trim()) return

    const supabase = createClient()
    const { error } = await supabase
      .from('chapters')
      .insert({
        classroom_id: id,
        title: newChapterTitle,
        order_index: chapters.length,
        required_score: 75
      })

    if (!error) {
      setNewChapterTitle('')
      setShowAddChapter(false)
      fetchData()
    }
  }

  const deleteChapter = async (chapterId: string) => {
    if (!confirm('Supprimer ce chapitre et toutes ses leçons ?')) return

    const supabase = createClient()
    await supabase.from('chapters').delete().eq('id', chapterId)
    fetchData()
  }

  const updateChapterScore = async (chapterId: string, score: number) => {
    const supabase = createClient()
    await supabase
      .from('chapters')
      .update({ required_score: score })
      .eq('id', chapterId)

    setEditingChapterId(null)
    fetchData()
  }

  const toggleChapterValidation = async (lessonId: string, currentValue: boolean) => {
    const supabase = createClient()
    await supabase
      .from('lessons')
      .update({ is_chapter_validation: !currentValue })
      .eq('id', lessonId)

    fetchData()
  }

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄'
      case 'video': return '🎥'
      case 'qcm': return '✅'
      case 'micro_learning': return '💡'
      case 'text': return '📝'
      default: return '📚'
    }
  }

  const getLessonTypeLabel = (type: string) => {
    switch (type) {
      case 'pdf': return 'PDF'
      case 'video': return 'Vidéo'
      case 'qcm': return 'QCM'
      case 'micro_learning': return 'Micro-learning'
      case 'text': return 'Texte'
      default: return type
    }
  }

  const getCourseTypeLabel = (type: string) => {
    switch (type) {
      case 'program': return 'Programme'
      case 'cursus': return 'Cursus'
      case 'formation': return 'Formation'
      default: return type || 'Programme'
    }
  }

  const getProgressionLabel = (type: string) => {
    switch (type) {
      case 'free': return 'Libre'
      case 'linear': return 'Linéaire'
      case 'qcm_validated': return 'Validation QCM'
      default: return type || 'Libre'
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const fetchAvailableStudents = async () => {
    setLoadingStudents(true)
    try {
      const response = await fetch(`/api/students?classroomId=${id}`)
      const data = await response.json()

      if (response.ok) {
        setAvailableStudents(data.students || [])
      } else {
        alert('Erreur lors du chargement des étudiants')
      }
    } catch (error) {
      console.error('Error fetching students:', error)
      alert('Erreur lors du chargement des étudiants')
    } finally {
      setLoadingStudents(false)
    }
  }

  const enrollStudent = async (studentId: string) => {
    setEnrollmentLoading(true)
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId: id, studentId })
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message || 'Étudiant inscrit avec succès !')
        setShowAddStudent(false)
        fetchData() // Refresh the student list
      } else {
        alert(data.error || 'Erreur lors de l\'inscription')
      }
    } catch (error) {
      console.error('Error enrolling student:', error)
      alert('Erreur lors de l\'inscription')
    } finally {
      setEnrollmentLoading(false)
    }
  }

  const removeEnrollment = async (enrollmentId: string) => {
    if (!confirm('Voulez-vous vraiment retirer cet étudiant de la classe ?')) return

    try {
      const response = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        alert('Étudiant retiré avec succès')
        fetchData() // Refresh the student list
      } else {
        alert(data.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error removing enrollment:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const handleShowAddStudent = () => {
    setShowAddStudent(true)
    fetchAvailableStudents()
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
        <h2>Classe non trouvée</h2>
        <Link href="/teacher/classrooms" style={{ color: '#2b8cee' }}>Retour</Link>
      </div>
    )
  }

  const totalLessons = chapters.reduce((acc, ch) => acc + ch.lessons.length, 0)
  const totalDuration = chapters.reduce((acc, ch) => 
    acc + ch.lessons.reduce((a, l) => a + (l.duration_minutes || 0), 0), 0
  )

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/teacher/classrooms" style={{ color: '#617589', textDecoration: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
          ← Retour aux classes
        </Link>
        
        {/* Class Info Card */}
        <div style={{ background: 'linear-gradient(135deg, #2b8cee, #1d4ed8)', borderRadius: '16px', padding: '24px', color: 'white', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div>
              <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                {classroom.is_public ? '🌐 Public' : '🔒 Privé'}
              </span>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '12px', marginBottom: '8px' }}>{classroom.title}</h1>
              <p style={{ opacity: 0.9, fontSize: '14px' }}>{classroom.subject} • {classroom.level}</p>
              
              <div style={{ display: 'flex', gap: '24px', marginTop: '20px' }}>
                <div>
                  <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{chapters.length}</p>
                  <p style={{ fontSize: '12px', opacity: 0.8 }}>Chapitres</p>
                </div>
                <div>
                  <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalLessons}</p>
                  <p style={{ fontSize: '12px', opacity: 0.8 }}>Leçons</p>
                </div>
                <div>
                  <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{actualEnrolledCount}</p>
                  <p style={{ fontSize: '12px', opacity: 0.8 }}>Élèves</p>
                </div>
                <div>
                  <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{classroom.is_free ? 'Gratuit' : `${classroom.price}€`}</p>
                  <p style={{ fontSize: '12px', opacity: 0.8 }}>Prix</p>
                </div>
                {!classroom.is_free && actualEnrolledCount > 0 && (
                  <div>
                    <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalEarnings}€</p>
                    <p style={{ fontSize: '12px', opacity: 0.8 }}>Revenus</p>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link
                href={`/teacher/courses/${id}/builder`}
                style={{ padding: '10px 16px', backgroundColor: 'rgba(255,255,255,0.3)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(255,255,255,0.4)' }}
              >
                🎯 Organiser le cours
              </Link>
              <Link
                href={`/classroom/${id}`}
                target="_blank"
                style={{ padding: '10px 16px', backgroundColor: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}
              >
                👁️ Aperçu
              </Link>
              <button style={{ padding: '10px 20px', backgroundColor: 'white', color: '#2b8cee', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                ⚙️ Paramètres
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Messages */}
      {showSuccess && isFirstTime && (
        <div style={{ marginBottom: '24px', backgroundColor: '#d1fae5', border: '2px solid #10b981', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '48px' }}>🎉</span>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#047857', marginBottom: '4px' }}>
              Félicitations !
            </h3>
            <p style={{ color: '#065f46', fontSize: '14px' }}>
              Votre classe a été créée avec succès. Vous pouvez maintenant commencer à ajouter des cours.
            </p>
          </div>
        </div>
      )}

      {courseCreated && (
        <div style={{ marginBottom: '24px', backgroundColor: '#dbeafe', border: '2px solid #2b8cee', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '48px' }}>✅</span>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '4px' }}>
              Cours créé avec succès !
            </h3>
            <p style={{ color: '#1e40af', fontSize: '14px' }}>
              Vous pouvez maintenant ajouter des chapitres et des leçons pour structurer votre contenu.
            </p>
          </div>
        </div>
      )}

      {/* Empty State - No Courses */}
      {courses.length === 0 && activeTab === 'content' && (
        <div style={{ marginBottom: '24px', backgroundColor: 'white', borderRadius: '20px', padding: '64px 32px', textAlign: 'center', border: '2px dashed #dbe0e6' }}>
          <span style={{ fontSize: '80px', display: 'block', marginBottom: '24px' }}>📚</span>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418', marginBottom: '12px' }}>
            Aucun cours dans cette classe
          </h2>
          <p style={{ color: '#617589', fontSize: '16px', marginBottom: '32px', maxWidth: '500px', margin: '0 auto 32px' }}>
            Commencez par créer votre premier cours pour structurer votre contenu pédagogique.
          </p>
          <Link
            href={`/teacher/classrooms/${id}/courses/new`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #2b8cee, #1d4ed8)',
              color: 'white',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: '700',
              boxShadow: '0 4px 15px rgba(43, 140, 238, 0.3)'
            }}
          >
            ✨ Créer votre 1er cours →
          </Link>
        </div>
      )}

      {/* Courses List */}
      {courses.length > 0 && activeTab === 'content' && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418' }}>
              Cours de la classe ({courses.length})
            </h2>
            <Link
              href={`/teacher/classrooms/${id}/courses/new`}
              style={{
                padding: '10px 20px',
                backgroundColor: '#2b8cee',
                color: 'white',
                borderRadius: '10px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              + Ajouter un cours
            </Link>
          </div>
          <div style={{ display: 'grid', gap: '12px' }}>
            {courses.map((course) => (
              <div
                key={course.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  border: '1px solid #dbe0e6',
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111418' }}>
                      {course.title}
                    </h3>
                    {course.access_type === 'free' && (
                      <span style={{ fontSize: '11px', backgroundColor: '#d1fae5', color: '#16a34a', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>
                        Gratuit
                      </span>
                    )}
                    {!course.is_published && (
                      <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>
                        Brouillon
                      </span>
                    )}
                  </div>
                  {course.description && (
                    <p style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>
                      {course.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#9ca3af' }}>
                    <span>💰 {course.price > 0 ? `${course.price}€` : 'Gratuit'}</span>
                    <span>👥 {course.enrolled_count || 0} inscrits</span>
                    <span>📅 {new Date(course.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link
                    href={`/teacher/courses/${course.id}`}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f3f4f6',
                      color: '#617589',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}
                  >
                    Modifier
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[
          { key: 'content', label: '📚 Contenu', count: totalLessons },
          { key: 'students', label: '👥 Élèves', count: actualEnrolledCount },
          { key: 'settings', label: '⚙️ Paramètres' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === tab.key ? 'white' : 'transparent',
              color: activeTab === tab.key ? '#111418' : '#617589',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{ backgroundColor: activeTab === tab.key ? '#2b8cee' : '#dbe0e6', color: activeTab === tab.key ? 'white' : '#617589', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Tab */}
      {activeTab === 'content' && (
        <div>
          {/* Course Info */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '16px 20px', marginBottom: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📋</span>
              <span style={{ fontSize: '14px', color: '#617589' }}>Type:</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>{getCourseTypeLabel(classroom.course_type)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🔄</span>
              <span style={{ fontSize: '14px', color: '#617589' }}>Progression:</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>{getProgressionLabel(classroom.progression_type)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>⏱️</span>
              <span style={{ fontSize: '14px', color: '#617589' }}>Durée:</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>{Math.floor(totalDuration / 60)}h {totalDuration % 60}min</span>
            </div>
          </div>

          {/* Info Box for QCM Validation */}
          <div style={{ backgroundColor: '#dbeafe', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>💡</span>
            <div>
              <p style={{ fontWeight: '600', color: '#1d4ed8', marginBottom: '4px' }}>Progression par validation QCM</p>
              <p style={{ fontSize: '13px', color: '#2563eb' }}>
                Marquez un QCM comme "Validation du chapitre" pour que l'élève doive le réussir avant de passer au chapitre suivant. 
                Vous pouvez définir le score minimum requis pour chaque chapitre.
              </p>
            </div>
          </div>

          {/* Chapters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {chapters.map((chapter, chapterIndex) => (
              <div key={chapter.id} style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
                {/* Chapter Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#2b8cee', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                      {chapterIndex + 1}
                    </span>
                    <div>
                      <h3 style={{ fontWeight: '600', color: '#111418', marginBottom: '4px' }}>{chapter.title}</h3>
                      <p style={{ fontSize: '13px', color: '#617589' }}>
                        {chapter.lessons.length} leçon{chapter.lessons.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Score requis */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {editingChapterId === chapter.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="number"
                            min="50"
                            max="100"
                            value={editingScore}
                            onChange={(e) => setEditingScore(parseInt(e.target.value) || 75)}
                            style={{ width: '60px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #dbe0e6', fontSize: '13px', textAlign: 'center' }}
                          />
                          <span style={{ fontSize: '13px', color: '#617589' }}>%</span>
                          <button
                            onClick={() => updateChapterScore(chapter.id, editingScore)}
                            style={{ padding: '6px 10px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingChapterId(null)}
                            style={{ padding: '6px 10px', backgroundColor: '#f3f4f6', color: '#617589', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingChapterId(chapter.id); setEditingScore(chapter.required_score) }}
                          style={{ padding: '6px 12px', backgroundColor: '#fef3c7', color: '#d97706', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}
                          title="Score minimum requis pour débloquer le chapitre suivant"
                        >
                          🎯 {chapter.required_score}% requis
                        </button>
                      )}
                    </div>

                    <Link
                      href={`/teacher/lessons/new?chapter=${chapter.id}&classroom=${id}`}
                      style={{ padding: '8px 16px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}
                    >
                      + Ajouter leçon
                    </Link>
                    <Link
                      href={`/teacher/assignments/new?classroom=${id}`}
                      style={{ padding: '8px 16px', backgroundColor: '#8b5cf6', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}
                    >
                      📝 Ajouter devoir
                    </Link>
                    <button
                      onClick={() => deleteChapter(chapter.id)}
                      style={{ padding: '8px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Lessons */}
                <div>
                  {chapter.lessons.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#617589' }}>
                      <p>Aucune leçon dans ce chapitre</p>
                      <Link href={`/teacher/lessons/new?chapter=${chapter.id}&classroom=${id}`} style={{ color: '#2b8cee', fontWeight: '500' }}>
                        Ajouter une leçon
                      </Link>
                    </div>
                  ) : (
                    chapter.lessons.map((lesson, lessonIndex) => (
                      <div
                        key={lesson.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 20px',
                          borderBottom: lessonIndex < chapter.lessons.length - 1 ? '1px solid #f3f4f6' : 'none',
                          backgroundColor: lesson.is_chapter_validation ? 'rgba(34, 197, 94, 0.05)' : 'transparent'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '20px' }}>{getLessonIcon(lesson.type)}</span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <p style={{ fontWeight: '500', color: '#111418', fontSize: '14px' }}>{lesson.title}</p>
                              {lesson.is_chapter_validation && (
                                <span style={{ fontSize: '11px', backgroundColor: '#d1fae5', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                                  ✓ Validation chapitre
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <span style={{ fontSize: '12px', color: '#617589' }}>{getLessonTypeLabel(lesson.type)}</span>
                              {lesson.duration_minutes > 0 && (
                                <span style={{ fontSize: '12px', color: '#617589' }}>• {lesson.duration_minutes} min</span>
                              )}
                              {lesson.is_free && (
                                <span style={{ fontSize: '11px', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '1px 6px', borderRadius: '4px' }}>Gratuit</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Toggle validation QCM */}
                          {lesson.type === 'qcm' && (
                            <button
                              onClick={() => toggleChapterValidation(lesson.id, lesson.is_chapter_validation)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: lesson.is_chapter_validation ? '#d1fae5' : '#f3f4f6',
                                color: lesson.is_chapter_validation ? '#16a34a' : '#617589',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}
                              title={lesson.is_chapter_validation ? 'Retirer comme validation' : 'Définir comme QCM de validation'}
                            >
                              {lesson.is_chapter_validation ? '✓ Validation ON' : '○ Validation OFF'}
                            </button>
                          )}
                          <Link
                            href={`/teacher/lessons/${lesson.id}`}
                            style={{ padding: '6px 14px', backgroundColor: '#f3f4f6', color: '#617589', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: '500' }}
                          >
                            Modifier
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            {/* Add Chapter */}
            {showAddChapter ? (
              <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '2px dashed #2b8cee', padding: '20px' }}>
                <input
                  type="text"
                  placeholder="Titre du chapitre"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #dbe0e6', marginBottom: '12px', fontSize: '14px' }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={addChapter}
                    style={{ padding: '10px 20px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={() => { setShowAddChapter(false); setNewChapterTitle('') }}
                    style={{ padding: '10px 20px', backgroundColor: '#f3f4f6', color: '#617589', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddChapter(true)}
                style={{ padding: '20px', backgroundColor: 'white', border: '2px dashed #dbe0e6', borderRadius: '12px', color: '#617589', fontSize: '14px', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span style={{ fontSize: '20px' }}>+</span> Ajouter un chapitre
              </button>
            )}
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418' }}>Élèves inscrits</h2>
              <p style={{ fontSize: '14px', color: '#617589' }}>{actualEnrolledCount} élève{actualEnrolledCount > 1 ? 's' : ''}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {!classroom.is_free && actualEnrolledCount > 0 && (
                <div style={{ backgroundColor: '#d1fae5', padding: '8px 16px', borderRadius: '8px' }}>
                  <p style={{ fontSize: '14px', color: '#16a34a', fontWeight: '600' }}>
                    💰 Revenus: {totalEarnings}€
                  </p>
                </div>
              )}
              <button
                onClick={handleShowAddStudent}
                style={{ padding: '10px 20px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                ➕ Inscrire un élève
              </button>
            </div>
          </div>

          {students.length === 0 ? (
            <div style={{ padding: '64px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <p style={{ color: '#617589', marginBottom: '8px' }}>Aucun élève inscrit</p>
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>Partagez le lien de votre cours pour avoir des inscriptions</p>
            </div>
          ) : (
            <div>
              {students.map((student, index) => (
                <div
                  key={student.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 24px',
                    borderBottom: index < students.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      backgroundColor: '#2b8cee',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {student.display_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', color: '#111418' }}>{student.display_name}</p>
                      <p style={{ fontSize: '13px', color: '#617589' }}>{student.email}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '13px', color: '#617589' }}>Inscrit le</p>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111418' }}>{formatDate(student.enrolled_at)}</p>
                    </div>
                    <Link
                      href={`/messages?user=${student.id}`}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#2b8cee',
                        color: 'white',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                    >
                      💬 Message
                    </Link>
                    <button
                      onClick={() => removeEnrollment(student.enrollment_id)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}
                      title="Retirer de la classe"
                    >
                      🗑️ Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Student Modal */}
          {showAddStudent && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '16px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Modal Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111418', marginBottom: '4px' }}>Inscrire un élève</h3>
                    <p style={{ fontSize: '14px', color: '#617589' }}>Sélectionnez un élève à inscrire dans cette classe</p>
                  </div>
                  <button
                    onClick={() => setShowAddStudent(false)}
                    style={{ padding: '8px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', color: '#617589' }}
                  >
                    ✕
                  </button>
                </div>

                {/* Modal Body */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
                  {loadingStudents ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                      <p style={{ color: '#617589' }}>Chargement des étudiants...</p>
                    </div>
                  ) : availableStudents.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
                      <p style={{ color: '#617589', marginBottom: '8px', fontWeight: '500' }}>Aucun élève disponible</p>
                      <p style={{ fontSize: '14px', color: '#9ca3af' }}>Tous les étudiants sont déjà inscrits dans cette classe</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {availableStudents.map((student) => (
                        <div
                          key={student.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            border: '1px solid #dbe0e6',
                            borderRadius: '10px',
                            backgroundColor: '#fafafa',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              backgroundColor: '#2b8cee',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '14px'
                            }}>
                              {student.display_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <p style={{ fontWeight: '600', color: '#111418', fontSize: '14px' }}>{student.display_name}</p>
                              <p style={{ fontSize: '13px', color: '#617589' }}>{student.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => enrollStudent(student.id)}
                            disabled={enrollmentLoading}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: enrollmentLoading ? '#dbe0e6' : '#16a34a',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: enrollmentLoading ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              opacity: enrollmentLoading ? 0.6 : 1
                            }}
                          >
                            {enrollmentLoading ? 'Inscription...' : '✓ Inscrire'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowAddStudent(false)}
                    style={{ padding: '10px 20px', backgroundColor: '#f3f4f6', color: '#617589', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '24px' }}>
          <h3 style={{ fontWeight: '600', marginBottom: '20px' }}>Paramètres de la classe</h3>
          <p style={{ color: '#617589' }}>Fonctionnalité à venir...</p>
        </div>
      )}
    </div>
  )
}

export default function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <p style={{ color: '#617589' }}>Chargement...</p>
      </div>
    }>
      <ClassroomDetailContent params={params} />
    </Suspense>
  )
}