import { createClient } from '@/lib/supabase/client'

type NotificationType = 
  | 'new_message'
  | 'enrollment'
  | 'lesson_completed'
  | 'qcm_passed'
  | 'qcm_failed'
  | 'chapter_unlocked'
  | 'live_session'
  | 'payment'
  | 'new_student'
  | 'review'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  data?: any
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  data
}: CreateNotificationParams) {
  const supabase = createClient()

  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    link,
    data
  })

  if (error) {
    console.error('Error creating notification:', error)
    return false
  }

  return true
}

// Helper functions for common notifications
export async function notifyNewMessage(userId: string, senderName: string) {
  return createNotification({
    userId,
    type: 'new_message',
    title: 'Nouveau message',
    message: `${senderName} vous a envoyé un message`,
    link: '/messages'
  })
}

export async function notifyNewEnrollment(teacherId: string, studentName: string, courseName: string) {
  return createNotification({
    userId: teacherId,
    type: 'new_student',
    title: 'Nouvel élève inscrit',
    message: `${studentName} s'est inscrit à "${courseName}"`,
    link: '/teacher/students'
  })
}

export async function notifyQcmResult(userId: string, passed: boolean, score: number, courseName: string) {
  return createNotification({
    userId,
    type: passed ? 'qcm_passed' : 'qcm_failed',
    title: passed ? 'QCM réussi !' : 'QCM échoué',
    message: `Score: ${score}% pour "${courseName}"`,
    link: '/student/my-courses'
  })
}

export async function notifyLiveSession(userId: string, sessionTitle: string, startsIn: string) {
  return createNotification({
    userId,
    type: 'live_session',
    title: 'Session live bientôt',
    message: `"${sessionTitle}" commence ${startsIn}`,
    link: '/student/schedule'
  })
}

export async function notifyChapterUnlocked(userId: string, chapterName: string, courseName: string) {
  return createNotification({
    userId,
    type: 'chapter_unlocked',
    title: 'Nouveau chapitre débloqué !',
    message: `"${chapterName}" est maintenant disponible dans "${courseName}"`,
    link: '/student/my-courses'
  })
}