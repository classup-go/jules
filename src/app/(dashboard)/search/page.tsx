'use client'

import { useState, useEffect } from 'react'
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
  enrolled_count: number
  teacher_id: string
  teacher_name?: string
  teacher_rating?: number
}

interface Teacher {
  id: string
  display_name: string
  avatar_url?: string
  bio?: string
  city?: string
  subjects: string[]
  levels: string[]
  teaching_mode: string[]
  hourly_rate?: number
  can_travel: boolean
  rating: number
  total_reviews: number
  experience?: string
  profile_completed: boolean
  verified: boolean
}

const SUBJECTS = ['Mathématiques', 'Physique', 'Chimie', 'SVT', 'Français', 'Anglais', 'Histoire-Géo', 'Philosophie', 'Informatique', 'Arabe', 'Économie']
const LEVELS = ['6ème', '5ème', '4ème', '3ème', 'Seconde', 'Première', 'Terminale', 'Licence', 'Master', 'Doctorat']

export default function SearchPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'courses' | 'teachers'>('courses')

  // Courses state
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  // Teachers state
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loadingTeachers, setLoadingTeachers] = useState(true)

  // Common filters
  const [search, setSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all')

  // Role-based access control: only students can search
  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'teacher') {
        router.push('/teacher/dashboard')
      }
    }

    checkRole()
  }, [router])

  // Fetch Courses
  useEffect(() => {
    const fetchCourses = async () => {
      const supabase = createClient()

      try {
        // Fetch courses with simplified query (no complex joins)
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('is_published', true)
          .order('enrolled_count', { ascending: false })

        if (coursesError) {
          console.error('Error fetching courses:', coursesError)
          setLoadingCourses(false)
          return
        }

        console.log('Courses fetched:', coursesData?.length || 0)

        if (coursesData && coursesData.length > 0) {
          // Get unique classroom IDs
          const classroomIds = [...new Set(coursesData.map(c => c.classroom_id).filter(Boolean))]

          // Fetch classrooms with teachers
          const { data: classroomsData } = await supabase
            .from('classrooms')
            .select('id, title, teacher_id')
            .in('id', classroomIds)

          // Get unique teacher IDs
          const teacherIds = [...new Set(classroomsData?.map(cl => cl.teacher_id).filter(Boolean) || [])]

          // Fetch teachers
          const { data: teachersData } = await supabase
            .from('users')
            .select('id, display_name, rating')
            .in('id', teacherIds)

          // Create lookup maps
          const classroomMap = new Map(classroomsData?.map(cl => [cl.id, cl]) || [])
          const teacherMap = new Map(teachersData?.map(t => [t.id, t]) || [])

          // Transform course data
          const transformedData = coursesData.map((course: any) => {
            const classroom = classroomMap.get(course.classroom_id)
            const teacher = classroom ? teacherMap.get(classroom.teacher_id) : null

            return {
              id: course.id,
              title: course.title,
              description: course.description,
              subject: course.subject,
              level: course.level,
              price: course.price || 0,
              is_free: course.access_type === 'free' || course.price === 0,
              enrolled_count: course.enrolled_count || 0,
              teacher_id: classroom?.teacher_id,
              teacher_name: teacher?.display_name || 'Professeur',
              teacher_rating: teacher?.rating || 0,
              classroom_id: course.classroom_id,
              _isCourse: true
            }
          })

          console.log('Transformed courses:', transformedData.length)
          setClassrooms(transformedData)
        } else {
          console.log('No courses found')
          setClassrooms([])
        }
      } catch (error) {
        console.error('Error:', error)
      }

      setLoadingCourses(false)
    }

    fetchCourses()
  }, [])

  // Fetch Teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      const supabase = createClient()

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, display_name, avatar_url, bio, city, subjects, levels, teaching_mode, hourly_rate, can_travel, rating, total_reviews, experience, profile_completed, verified')
          .eq('role', 'teacher')
          .eq('profile_completed', true)
          .eq('is_available', true)
          .order('verified', { ascending: false })
          .order('rating', { ascending: false })

        if (error) {
          console.error('Error fetching teachers:', error)
        } else {
          setTeachers(data || [])
        }
      } catch (error) {
        console.error('Error:', error)
      }

      setLoadingTeachers(false)
    }

    fetchTeachers()
  }, [])

  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getSubjectStyle = (subject: string) => {
    const styles: { [key: string]: { bg: string, text: string, icon: string } } = {
      'Mathématiques': { bg: '#dbeafe', text: '#2563eb', icon: '📐' },
      'Physique': { bg: '#fef3c7', text: '#d97706', icon: '⚡' },
      'Chimie': { bg: '#fce7f3', text: '#db2777', icon: '🧪' },
      'Français': { bg: '#f3e8ff', text: '#9333ea', icon: '📝' },
      'Anglais': { bg: '#e0e7ff', text: '#4f46e5', icon: '🌍' },
      'Histoire-Géo': { bg: '#ffedd5', text: '#ea580c', icon: '🗺️' },
      'SVT': { bg: '#d1fae5', text: '#059669', icon: '🌱' },
      'Informatique': { bg: '#cffafe', text: '#0891b2', icon: '💻' },
      'Philosophie': { bg: '#fef3c7', text: '#92400e', icon: '🤔' },
      'Arabe': { bg: '#e0e7ff', text: '#4f46e5', icon: '📖' },
      'Économie': { bg: '#fef3c7', text: '#d97706', icon: '💰' },
    }
    return styles[subject] || { bg: '#f3f4f6', text: '#6b7280', icon: '📚' }
  }

  // Filter Courses
  const filteredClassrooms = classrooms.filter(c => {
    const matchesSearch = search === '' ||
      c.title?.toLowerCase().includes(search.toLowerCase()) ||
      c.subject?.toLowerCase().includes(search.toLowerCase()) ||
      c.teacher_name?.toLowerCase().includes(search.toLowerCase())

    const matchesSubject = selectedSubject === '' || c.subject === selectedSubject
    const matchesLevel = selectedLevel === '' || c.level === selectedLevel
    const matchesPrice = priceFilter === 'all' ||
      (priceFilter === 'free' && c.is_free) ||
      (priceFilter === 'paid' && !c.is_free)

    return matchesSearch && matchesSubject && matchesLevel && matchesPrice
  })

  // Filter Teachers
  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = search === '' ||
      t.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.city?.toLowerCase().includes(search.toLowerCase()) ||
      t.bio?.toLowerCase().includes(search.toLowerCase())

    const matchesSubject = selectedSubject === '' || t.subjects?.includes(selectedSubject)
    const matchesLevel = selectedLevel === '' || t.levels?.includes(selectedLevel)
    const matchesPrice = priceFilter === 'all' ||
      (priceFilter === 'free' && (!t.hourly_rate || t.hourly_rate === 0)) ||
      (priceFilter === 'paid' && t.hourly_rate && t.hourly_rate > 0)

    return matchesSearch && matchesSubject && matchesLevel && matchesPrice
  })

  const loading = activeTab === 'courses' ? loadingCourses : loadingTeachers
  const resultCount = activeTab === 'courses' ? filteredClassrooms.length : filteredTeachers.length

  return (
    <>
      <style>{`
        .search-results-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 1024px) {
          .search-results-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .search-results-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '4px' }}>Rechercher</h1>
          <p style={{ color: '#617589' }}>Trouvez des cours ou des professeurs adaptés à vos besoins</p>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', borderBottom: '2px solid #f3f4f6' }}>
          <button
            onClick={() => setActiveTab('courses')}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'courses' ? '#2b8cee' : '#617589',
              fontWeight: activeTab === 'courses' ? '600' : '500',
              fontSize: '15px',
              cursor: 'pointer',
              borderBottom: activeTab === 'courses' ? '2px solid #2b8cee' : 'none',
              marginBottom: '-2px',
            }}
          >
            📚 Cours ({classrooms.length})
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'teachers' ? '#2b8cee' : '#617589',
              fontWeight: activeTab === 'teachers' ? '600' : '500',
              fontSize: '15px',
              cursor: 'pointer',
              borderBottom: activeTab === 'teachers' ? '2px solid #2b8cee' : 'none',
              marginBottom: '-2px',
            }}
          >
            👨‍🏫 Professeurs ({teachers.length})
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ flex: 2, minWidth: '250px' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
                <input
                  type="text"
                  placeholder={activeTab === 'courses' ? "Rechercher un cours..." : "Rechercher un professeur..."}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '10px', border: '1px solid #dbe0e6', fontSize: '15px' }}
                />
              </div>
            </div>

            {/* Subject Filter */}
            <div style={{ flex: 1, minWidth: '150px' }}>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid #dbe0e6', fontSize: '15px', backgroundColor: 'white' }}
              >
                <option value="">Toutes les matières</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Level Filter */}
            <div style={{ flex: 1, minWidth: '150px' }}>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', borderRadius: '10px', border: '1px solid #dbe0e6', fontSize: '15px', backgroundColor: 'white' }}
              >
                <option value="">Tous les niveaux</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Price Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            {[
              { key: 'all', label: 'Tous' },
              { key: 'free', label: '🆓 Gratuits' },
              { key: 'paid', label: '💰 Payants' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setPriceFilter(f.key as any)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: priceFilter === f.key ? 'none' : '1px solid #dbe0e6',
                  backgroundColor: priceFilter === f.key ? '#2b8cee' : 'white',
                  color: priceFilter === f.key ? 'white' : '#617589',
                  fontWeight: '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <p style={{ color: '#617589', fontSize: '14px' }}>
            <strong style={{ color: '#111418' }}>{resultCount}</strong> {activeTab === 'courses' ? 'cours' : 'professeur(s)'} trouvé(s)
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
            <p style={{ color: '#617589' }}>Chargement...</p>
          </div>
        )}

        {/* Results - Courses Tab */}
        {!loading && activeTab === 'courses' && (
          <>
            {filteredClassrooms.length === 0 ? (
              <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '64px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>Aucun résultat</h3>
                <p style={{ color: '#617589' }}>Essayez de modifier vos critères de recherche</p>
              </div>
            ) : (
              <div className="search-results-grid">
                {filteredClassrooms.map((classroom) => {
                  const style = getSubjectStyle(classroom.subject)
                  return (
                    <Link
                      key={classroom.id}
                      href={`/classroom/${classroom.classroom_id}`}
                      style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden', textDecoration: 'none', transition: 'all 0.2s ease' }}
                    >
                      {/* Header */}
                      <div style={{ padding: '20px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                            {style.icon}
                          </div>
                          <span style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: classroom.is_free ? 'rgba(34, 197, 94, 0.1)' : 'rgba(43, 140, 238, 0.1)', color: classroom.is_free ? '#16a34a' : '#2b8cee', fontSize: '13px', fontWeight: '600' }}>
                            {classroom.is_free ? 'Gratuit' : `${classroom.price}€`}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111418', marginBottom: '4px' }}>{classroom.title}</h3>
                        <p style={{ fontSize: '14px', color: '#617589', marginBottom: '8px' }}>{classroom.subject} • {classroom.level}</p>
                        <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.4' }}>
                          {classroom.description?.slice(0, 80) || 'Aucune description'}...
                        </p>
                      </div>

                      {/* Teacher */}
                      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#2b8cee', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                            {getInitials(classroom.teacher_name || '')}
                          </div>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: '600', color: '#111418' }}>{classroom.teacher_name || 'Professeur'}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: '#facc15', fontSize: '12px' }}>⭐</span>
                              <span style={{ fontSize: '12px', color: '#617589' }}>{classroom.teacher_rating?.toFixed(1) || 'Nouveau'}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#617589' }}>
                          <span>👥</span> {classroom.enrolled_count || 0}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Results - Teachers Tab */}
        {!loading && activeTab === 'teachers' && (
          <>
            {filteredTeachers.length === 0 ? (
              <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '64px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍🏫</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111418', marginBottom: '8px' }}>Aucun professeur trouvé</h3>
                <p style={{ color: '#617589' }}>Essayez de modifier vos critères de recherche</p>
              </div>
            ) : (
              <div className="search-results-grid">
                {filteredTeachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    onClick={() => router.push(`/teachers/${teacher.id}`)}
                    style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '20px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#2b8cee', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', flexShrink: 0, overflow: 'hidden' }}>
                        {teacher.avatar_url ? (
                          <img src={teacher.avatar_url} alt={teacher.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          getInitials(teacher.display_name)
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111418', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {teacher.display_name}
                          </h3>
                          {teacher.verified && <span style={{ fontSize: '16px' }}>✓</span>}
                        </div>
                        <p style={{ fontSize: '13px', color: '#617589', margin: 0 }}>📍 {teacher.city || 'Non spécifié'}</p>
                      </div>
                    </div>

                    {/* Rating */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: '#facc15', fontSize: '14px' }}>⭐</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#111418' }}>
                          {teacher.rating > 0 ? teacher.rating.toFixed(1) : '0.0'}
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', color: '#9ca3af' }}>
                        ({teacher.total_reviews || 0} avis)
                      </span>
                    </div>

                    {/* Bio */}
                    <p style={{ fontSize: '13px', color: '#617589', lineHeight: '1.5', marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {teacher.bio || 'Professeur expérimenté'}
                    </p>

                    {/* Subjects */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {teacher.subjects?.slice(0, 3).map((subject, i) => {
                        const style = getSubjectStyle(subject)
                        return (
                          <span key={i} style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: style.bg, color: style.text, fontSize: '12px', fontWeight: '500' }}>
                            {subject}
                          </span>
                        )
                      })}
                      {teacher.subjects && teacher.subjects.length > 3 && (
                        <span style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: '12px', fontWeight: '500' }}>
                          +{teacher.subjects.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Teaching Modes */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', fontSize: '14px' }}>
                      {teacher.teaching_mode?.includes('online') && <span>💻</span>}
                      {teacher.teaching_mode?.includes('in_person') && <span>🏫</span>}
                      {teacher.teaching_mode?.includes('at_home') && <span>🏠</span>}
                      {teacher.can_travel && <span>🚗</span>}
                    </div>

                    {/* Experience & Price */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#617589' }}>
                        {teacher.experience || 'Expérience non spécifiée'}
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2b8cee' }}>
                        {teacher.hourly_rate ? `${teacher.hourly_rate}€/h` : 'Sur devis'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
