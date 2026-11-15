import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select('*, classroom:classrooms(*)')
    .eq('id', id)
    .single()

  if (!course) {
    notFound()
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
      <div className="bg-white px-6 py-4 border-b">
        <div className="flex items-center gap-4 mb-2">
          <Link href={'/teacher/classrooms/' + course.classroom_id}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-3xl">{getTypeIcon(course.type)}</span>
        </div>
        <h1 className="text-xl font-bold text-[#1A1A2E]">{course.title}</h1>
        <p className="text-sm text-[#6B7280]">{course.classroom?.title}</p>
        <div className="flex items-center gap-3 mt-3">
          <span className={course.is_free ? 'text-sm px-3 py-1 rounded-full bg-green-100 text-green-600' : 'text-sm px-3 py-1 rounded-full bg-[#FFF8E7] text-[#F5A623]'}>
            {course.is_free ? 'Gratuit' : course.price + ' TND'}
          </span>
        </div>
      </div>

      {course.description && (
        <div className="px-6 py-4">
          <p className="text-[#6B7280]">{course.description}</p>
        </div>
      )}

      {course.type === 'qcm' && qcmQuestions && (
        <div className="px-6 py-4">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">Questions ({qcmQuestions.length})</h2>
          <div className="space-y-4">
            {qcmQuestions.map((q: any, index: number) => (
              <div key={q.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="font-medium text-[#1A1A2E] mb-3">{index + 1}. {q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt: string, oIndex: number) => (
                    <div
                      key={oIndex}
                      className={q.correct_answer === oIndex ? 'px-4 py-2 rounded-xl text-sm bg-green-100 text-green-700 border border-green-300' : 'px-4 py-2 rounded-xl text-sm bg-gray-50 text-[#6B7280]'}
                    >
                      {String.fromCharCode(65 + oIndex)}. {opt} {q.correct_answer === oIndex && '✓'}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-sm text-[#6B7280] mt-3 italic">💡 {q.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {course.type === 'exercise' && exercises && (
        <div className="px-6 py-4">
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">Exercices ({exercises.length})</h2>
          <div className="space-y-4">
            {exercises.map((ex: any, index: number) => (
              <div key={ex.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="font-medium text-[#1A1A2E] mb-3">Exercice {index + 1}: {ex.title}</p>
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <p className="text-sm font-medium text-[#1A1A2E] mb-1">📋 Énoncé</p>
                  <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{ex.statement}</p>
                </div>
                {ex.solution && (
                  <details className="bg-green-50 rounded-xl p-3">
                    <summary className="text-sm font-medium text-green-700 cursor-pointer">✅ Voir le corrigé</summary>
                    <p className="text-sm text-green-600 mt-2 whitespace-pre-wrap">{ex.solution}</p>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {['video', 'pdf', 'micro'].includes(course.type) && (
        <div className="px-6 py-4">
          {course.content_url ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              {course.type === 'video' && (
                <video src={course.content_url} controls className="w-full rounded-xl" />
              )}
              {course.type === 'pdf' && (
                <a href={course.content_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-[#E8F1FB] rounded-xl">
                  <span className="text-3xl">📄</span>
                  <div>
                    <p className="font-medium text-[#1E6DD1]">Voir le PDF</p>
                    <p className="text-sm text-[#6B7280]">Cliquez pour ouvrir</p>
                  </div>
                </a>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center">
              <span className="text-4xl mb-3 block">{getTypeIcon(course.type)}</span>
              <p className="text-[#6B7280] mb-4">Aucun fichier uploadé</p>
              <button className="bg-[#1E6DD1] text-white px-6 py-3 rounded-full font-semibold">
                Uploader un fichier
              </button>
            </div>
          )}
        </div>
      )}

      <div className="px-6 py-4 flex gap-3">
        <button className="flex-1 bg-[#1E6DD1] text-white py-3 rounded-full font-semibold">
          ✏️ Modifier
        </button>
        <button className="bg-red-100 text-red-600 px-4 py-3 rounded-full">
          🗑️
        </button>
      </div>
    </div>
  )
}