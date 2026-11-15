import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import QCMPlayer from '@/components/qcm-player'
import ExerciseViewer from '@/components/exercise-viewer'

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: course } = await supabase
    .from('courses')
    .select('*, classroom:classrooms(*)')
    .eq('id', id)
    .single()

  if (!course) {
    notFound()
  }

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('*')
    .eq('classroom_id', course.classroom_id)
    .eq('student_id', user.id)
    .single()

  if (!enrollment && !course.is_free) {
    redirect('/classroom/' + course.classroom_id)
  }

  let qcmQuestions = null
  if (course.type === 'qcm') {
    const { data } = await supabase
      .from('qcm_questions')
      .select('*')
      .eq('course_id', id)
      .order('order_index', { ascending: true })
    qcmQuestions = data
  }

  let exercises = null
  if (course.type === 'exercise') {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .eq('course_id', id)
      .order('order_index', { ascending: true })
    exercises = data
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎬'
      case 'pdf': return '📄'
      case 'micro': return '⚡'
      case 'exercise': return '✏️'
      case 'qcm': return '📝'
      default: return '📚'
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-6">
      <div className="bg-white px-6 py-4 border-b sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href={'/classroom/' + course.classroom_id}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-[#1A1A2E]">{course.title}</h1>
            <p className="text-xs text-[#6B7280]">{course.classroom?.title}</p>
          </div>
          <span className="text-2xl">{getTypeIcon(course.type)}</span>
        </div>
      </div>

      <div className="px-6 py-6">
        {course.type === 'video' && (
          <div className="space-y-4">
            {course.content_url ? (
              <div className="bg-black rounded-2xl overflow-hidden">
                <video src={course.content_url} controls className="w-full" />
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center">
                <span className="text-4xl mb-3 block">🎬</span>
                <p className="text-[#6B7280]">Vidéo non disponible</p>
              </div>
            )}
            {course.description && (
              <div className="bg-white rounded-2xl p-4">
                <h3 className="font-semibold text-[#1A1A2E] mb-2">Description</h3>
                <p className="text-sm text-[#6B7280]">{course.description}</p>
              </div>
            )}
          </div>
        )}

        {course.type === 'pdf' && (
          <div className="space-y-4">
            {course.content_url ? (
              <a href={course.content_url} target="_blank" rel="noopener noreferrer" className="block bg-white rounded-2xl p-6 text-center">
                <span className="text-6xl mb-4 block">📄</span>
                <p className="font-semibold text-[#1E6DD1] mb-2">Ouvrir le PDF</p>
                <p className="text-sm text-[#6B7280]">Cliquez pour télécharger ou visualiser</p>
              </a>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center">
                <span className="text-4xl mb-3 block">📄</span>
                <p className="text-[#6B7280]">PDF non disponible</p>
              </div>
            )}
          </div>
        )}

        {course.type === 'qcm' && qcmQuestions && (
          <QCMPlayer questions={qcmQuestions} courseId={id} />
        )}

        {course.type === 'exercise' && exercises && (
          <ExerciseViewer exercises={exercises} />
        )}

        {course.type === 'micro' && (
          <div className="space-y-4">
            {course.content_url ? (
              <div className="bg-white rounded-2xl overflow-hidden">
                <video src={course.content_url} controls className="w-full" />
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-4">
                <p className="text-[#6B7280]">{course.description || 'Contenu non disponible'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}