'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Student {
  id: string
  display_name: string
  email: string
  enrollments: { classroom_title: string; classroom_subject: string }[]
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    try {
      const { data: classroomsData } = await supabase.from('classrooms').select('id, title, subject').eq('teacher_id', user.id)
      if (!classroomsData || classroomsData.length === 0) { setLoading(false); return }

      const classroomIds = classroomsData.map(c => c.id)
      const classroomMap = new Map(classroomsData.map(c => [c.id, c]))

      const { data: enrollmentsData } = await supabase.from('enrollments').select('student_id, classroom_id').in('classroom_id', classroomIds)
      if (!enrollmentsData || enrollmentsData.length === 0) { setLoading(false); return }

      const studentIds = [...new Set(enrollmentsData.map(e => e.student_id))]
      const studentsResult: Student[] = []

      for (const studentId of studentIds) {
        const { data: studentData } = await supabase.from('users').select('id, display_name, email').eq('id', studentId).single()
        if (studentData) {
          const studentEnrollments = enrollmentsData.filter(e => e.student_id === studentId).map(e => {
            const classroom = classroomMap.get(e.classroom_id)
            return { classroom_title: classroom?.title || '', classroom_subject: classroom?.subject || '' }
          })
          studentsResult.push({ ...studentData, enrollments: studentEnrollments })
        }
      }
      setStudents(studentsResult)
    } catch (error) { console.error('Error:', error) }
    setLoading(false)
  }

  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

  const getSubjectStyle = (subject: string) => {
    const styles: Record<string, { bg: string, text: string }> = {
      'Mathématiques': { bg: '#dbeafe', text: '#2563eb' }, 'Physique': { bg: '#fef3c7', text: '#d97706' },
      'Chimie': { bg: '#fce7f3', text: '#db2777' }, 'Français': { bg: '#f3e8ff', text: '#9333ea' },
      'Histoire-Géo': { bg: '#ffedd5', text: '#ea580c' }, 'SVT': { bg: '#d1fae5', text: '#059669' },
    }
    return styles[subject] || { bg: '#f3f4f6', text: '#6b7280' }
  }

  const filteredStudents = students.filter(s => search === '' || s.display_name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}><p style={{ color: '#617589' }}>Chargement...</p></div>

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111418', marginBottom: '4px' }}>Mes Élèves</h1>
        <p style={{ color: '#617589' }}>Gérez vos élèves inscrits</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👥</div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{students.length}</p>
              <p style={{ fontSize: '13px', color: '#617589' }}>Élèves total</p>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #dbe0e6', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📚</div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111418' }}>{students.reduce((sum, s) => sum + s.enrollments.length, 0)}</p>
              <p style={{ fontSize: '13px', color: '#617589' }}>Inscriptions</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '16px', marginBottom: '24px' }}>
        <input type="text" placeholder="🔍 Rechercher un élève..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #dbe0e6', fontSize: '14px' }} />
      </div>

      {filteredStudents.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', padding: '64px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111418', marginBottom: '8px' }}>{students.length === 0 ? 'Aucun élève' : 'Aucun résultat'}</h3>
          <p style={{ color: '#617589' }}>{students.length === 0 ? 'Vos élèves apparaîtront ici' : 'Modifiez votre recherche'}</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #dbe0e6', overflow: 'hidden' }}>
          {filteredStudents.map((student, i) => (
            <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: i < filteredStudents.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#2b8cee', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{getInitials(student.display_name)}</div>
                <div>
                  <p style={{ fontWeight: '600', color: '#111418' }}>{student.display_name}</p>
                  <p style={{ fontSize: '13px', color: '#617589' }}>{student.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {student.enrollments.slice(0, 2).map((e, j) => {
                  const style = getSubjectStyle(e.classroom_subject)
                  return <span key={j} style={{ padding: '4px 10px', borderRadius: '20px', backgroundColor: style.bg, color: style.text, fontSize: '11px', fontWeight: '500' }}>{e.classroom_title}</span>
                })}
                {student.enrollments.length > 2 && <span style={{ padding: '4px 10px', borderRadius: '20px', backgroundColor: '#f3f4f6', color: '#617589', fontSize: '11px' }}>+{student.enrollments.length - 2}</span>}
                <button style={{ padding: '8px 12px', backgroundColor: '#2b8cee', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginLeft: '8px' }}>💬</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}