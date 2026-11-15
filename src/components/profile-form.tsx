'use client'

import { useState } from 'react'

interface ProfileFormProps {
  profile: any
  teacherProfile: any
  isTeacher: boolean
}

export default function ProfileForm({ profile, teacherProfile, isTeacher }: ProfileFormProps) {
  return (
    <div className="px-6 mt-6">
      {/* Bio */}
      {profile?.bio && (
        <div className="bg-white rounded-2xl p-4 mb-4">
          <h3 className="font-semibold text-[#1A1A2E] mb-2">À propos</h3>
          <p className="text-sm text-[#6B7280]">{profile.bio}</p>
        </div>
      )}

      {/* Teacher Info */}
      {isTeacher && teacherProfile && (
        <>
          {/* Subjects */}
          {teacherProfile.subjects?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-[#1A1A2E] mb-3">Matières enseignées</h3>
              <div className="flex flex-wrap gap-2">
                {teacherProfile.subjects.map((subject: string) => (
                  <span
                    key={subject}
                    className="px-3 py-1 bg-[#E8F1FB] text-[#1E6DD1] rounded-full text-sm"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Levels */}
          {teacherProfile.levels?.length > 0 && (
            <div className="bg-white rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-[#1A1A2E] mb-3">Niveaux</h3>
              <div className="flex flex-wrap gap-2">
                {teacherProfile.levels.map((level: string) => (
                  <span
                    key={level}
                    className="px-3 py-1 bg-[#FFF8E7] text-[#F5A623] rounded-full text-sm"
                  >
                    {level}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Location */}
      {profile?.country && (
        <div className="bg-white rounded-2xl p-4 mb-4">
          <h3 className="font-semibold text-[#1A1A2E] mb-2">Localisation</h3>
          <p className="text-sm text-[#6B7280]">📍 {profile.city}, {profile.country}</p>
        </div>
      )}
    </div>
  )
}