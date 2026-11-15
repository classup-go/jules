import { StudentGuard } from '@/components/guards/RoleGuard'

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <StudentGuard>{children}</StudentGuard>
}
