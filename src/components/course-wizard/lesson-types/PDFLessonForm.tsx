'use client'

import { UseFormReturn } from 'react-hook-form'
import { CourseWizardData } from '@/lib/validations/course-wizard'

interface PDFLessonFormProps {
  form: UseFormReturn<CourseWizardData>
  fieldPath: string
}

export function PDFLessonForm({ form, fieldPath }: PDFLessonFormProps) {
  const { setValue, watch } = form

  const content = watch(fieldPath as any)
  const pdfFile = content?.pdf_file || ''
  const description = content?.description || ''

  const handleSave = () => {
    const pdfContent = {
      type: 'pdf' as const,
      pdf_file: pdfFile || 'uploaded_pdf_path.pdf',
      description: description,
    }
    setValue(fieldPath as any, pdfContent, { shouldValidate: true })
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Leçon PDF</h4>

        {/* PDF Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Document PDF <span className="text-red-500">*</span>
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              Cliquez pour sélectionner ou glissez-déposez votre PDF
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF jusqu'à 25MB
            </p>
          </div>
          {pdfFile && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-blue-900 font-medium truncate">
                {pdfFile}
              </span>
            </div>
          )}
          <p className="text-xs text-orange-600 mt-2">
            Note: L'upload de fichiers sera implémenté avec Supabase Storage
          </p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setValue(`${fieldPath}.description` as any, e.target.value)}
          rows={4}
          placeholder="Décrivez le contenu de ce document PDF..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-sm text-gray-500 mt-1">
          {description.length} caractères (minimum 10)
        </p>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
      >
        💾 Enregistrer le contenu PDF
      </button>

      {content && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✓ Contenu enregistré pour cette leçon
          </p>
        </div>
      )}
    </div>
  )
}
