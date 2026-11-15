# 🎯 PLAN DE REFACTORING UX - POINT D'ENTRÉE UNIQUE
## Mission: "Créer une classe" comme seule action visible

**Date**: 2026-01-20
**Objectif**: Simplifier l'UX prof avec UN seul flow clair
**Principe**: Zéro rewrite, 100% refactoring safe

---

## ✅ VISION CIBLE

### Avant (Confusion totale):
```
Dashboard Prof
  ├─ ➕ Créer un cours ❓
  ├─ ➕ Nouveau template ❓
  └─ ➕ Créer une classe ❓
      └─ "C'est quoi la différence???"
```

### Après (Clarté absolue):
```
Dashboard Prof
  └─ ➕ Créer une classe 🎯
      └─ Wizard 4 steps
          ├─ Step 1: Infos classe
          ├─ Step 2: Objectifs pédagogiques
          ├─ Step 3: Premier cours (obligatoire)
          └─ Step 4: Contenu initial
```

---

## 📋 CHECKLIST TECHNIQUE - PAR ORDRE D'EXÉCUTION

### 🟥 PHASE 0: PRÉPARATION (30 min)

- [x] Créer branche `refactor/ux-class-entry`
- [x] Documenter plan de refactoring
- [x] Lister tous les fichiers à modifier (pas supprimer)
- [x] Backup mental de l'architecture actuelle

**Commande Git:**
```bash
git checkout -b refactor/ux-class-entry
git add REFACTOR-PLAN-UX-CLASSE-UNIQUE.md
git commit -m "docs: plan de refactoring UX entrée unique classe"
```

---

### 🟧 PHASE 1: MASQUAGE ROUTES (1h)

**Objectif**: Cacher ce qui confuse, SANS supprimer

#### A. Navigation Dashboard Prof

**Fichier**: `src/app/(dashboard)/teacher/dashboard/page.tsx`

**Modifications:**

```typescript
// AVANT
<Link href="/teacher/classrooms/new">Créer un cours</Link>
<Link href="/teacher/courses/new">Nouveau cours</Link>
<Link href="/teacher/course-templates">Templates</Link>

// APRÈS (Point d'entrée unique)
<Link href="/teacher/classes/create">➕ Créer une classe</Link>
```

**✅ Actions:**
- [ ] Modifier le bouton principal du dashboard
- [ ] Changer couleur/taille pour le rendre évident
- [ ] Enlever tous les autres boutons de création
- [ ] Garder "Mes classes" pour voir les existantes

#### B. Sidebar/Menu Navigation

**Fichier**: `src/components/layout/TeacherLayout.tsx` (ou équivalent)

**Masquer:**
```typescript
// ❌ Retirer du menu visible
{ label: 'Cours', href: '/teacher/courses' }
{ label: 'Templates', href: '/teacher/course-templates' }

// ✅ Garder uniquement
{ label: 'Mes classes', href: '/teacher/classes' }
{ label: 'Sessions live', href: '/teacher/sessions' }
{ label: 'Profil', href: '/teacher/profile' }
```

**✅ Actions:**
- [ ] Identifier fichier layout teacher
- [ ] Commenter (pas supprimer) les items de menu confusion
- [ ] Ajouter commentaire `// Hidden during UX refactor - still accessible via URL`

#### C. Routes Protection (Soft Block)

**Fichier**: `src/app/(dashboard)/teacher/courses/new/page.tsx`

**Ajouter bannière de redirection:**
```typescript
export default function NewCoursePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md bg-yellow-50 border-2 border-yellow-500 rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-4">🚧 Nouvelle interface</h2>
        <p className="mb-6">
          Nous avons simplifié la création de cours.
          Tout commence maintenant par une classe.
        </p>
        <Link
          href="/teacher/classes/create"
          className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-semibold"
        >
          ➕ Créer une classe
        </Link>
        <Link
          href="/teacher/classes"
          className="block w-full mt-3 text-center text-gray-600"
        >
          Voir mes classes
        </Link>
      </div>
    </div>
  )
}
```

**✅ Actions:**
- [ ] Ajouter bannière redirection dans `/teacher/courses/new`
- [ ] Ajouter bannière redirection dans `/teacher/course-templates`
- [ ] Garder les routes fonctionnelles (pour wizard interne)

---

### 🟦 PHASE 2: CRÉATION WIZARD 4 STEPS (3h)

**Nouveau fichier**: `src/app/(dashboard)/teacher/classes/create/page.tsx`

#### Structure du Wizard

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClassWizard } from '@/components/class-wizard/ClassWizard'

export default function CreateClassPage() {
  return <ClassWizard />
}
```

#### Fichier Principal Wizard

**Nouveau fichier**: `src/components/class-wizard/ClassWizard.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { classWizardSchema, ClassWizardData } from '@/lib/validations/class-wizard'
import { Step1ClassInfo } from './steps/Step1ClassInfo'
import { Step2Objectives } from './steps/Step2Objectives'  // Réutiliser existant!
import { Step3FirstCourse } from './steps/Step3FirstCourse'
import { Step4Content } from './steps/Step4Content'
import { WizardProgress } from './WizardProgress'

const STEPS = [
  { number: 1, label: 'Infos de la classe', icon: '🏫' },
  { number: 2, label: 'Objectifs pédagogiques', icon: '🎯' },
  { number: 3, label: 'Premier cours', icon: '📚' },
  { number: 4, label: 'Contenu initial', icon: '✍️' }
]

export function ClassWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [classId, setClassId] = useState<string | null>(null)

  const form = useForm<ClassWizardData>({
    resolver: zodResolver(classWizardSchema),
    mode: 'onBlur',
    defaultValues: {
      // Step 1
      class_name: '',
      subject: '',
      level: 'college',
      class_type: 'cursus',
      is_public: false,

      // Step 2 (réutiliser existant)
      learning_objectives: ['', '', ''],
      prerequisites: [],

      // Step 3
      first_course: {
        title: '',
        description: '',
        is_free: true
      },

      // Step 4
      initial_content: {
        type: 'text',
        content: ''
      }
    }
  })

  const handleSubmit = async (data: ClassWizardData) => {
    try {
      // 1. Créer la classe
      const classResponse = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.class_name,
          subject: data.subject,
          level: data.level,
          class_type: data.class_type,
          is_public: data.is_public,
          learning_objectives: data.learning_objectives,
          prerequisites: data.prerequisites
        })
      })

      const { id: newClassId } = await classResponse.json()
      setClassId(newClassId)

      // 2. Créer le cours initial automatiquement
      await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: newClassId,
          title: data.first_course.title,
          description: data.first_course.description,
          is_free: data.first_course.is_free,
          is_initial: true, // 🔥 Marqueur important
          initial_content: data.initial_content
        })
      })

      // 3. Redirection vers la classe créée
      router.push(`/teacher/classes/${newClassId}?success=created`)

    } catch (error) {
      console.error('Error creating class:', error)
    }
  }

  const handleNext = async () => {
    // Validation par step
    const isValid = await form.trigger()
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1ClassInfo form={form} />
      case 2:
        return <Step2Objectives form={form} /> // ✅ Réutiliser existant
      case 3:
        return <Step3FirstCourse form={form} />
      case 4:
        return <Step4Content form={form} onSubmit={form.handleSubmit(handleSubmit)} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WizardProgress currentStep={currentStep} steps={STEPS} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Précédent
          </button>

          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continuer →
            </button>
          ) : (
            <button
              type="button"
              onClick={form.handleSubmit(handleSubmit)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              ✅ Créer la classe
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

**✅ Actions:**
- [ ] Créer dossier `src/components/class-wizard/`
- [ ] Créer ClassWizard.tsx
- [ ] Créer WizardProgress.tsx (réutiliser existant course-wizard)
- [ ] Créer les 4 steps

---

### 🟦 PHASE 3: STEPS DU WIZARD (2h)

#### Step 1: Infos de la Classe

**Nouveau fichier**: `src/components/class-wizard/steps/Step1ClassInfo.tsx`

```typescript
'use client'

import { UseFormReturn } from 'react-hook-form'
import { ClassWizardData } from '@/lib/validations/class-wizard'

const SUBJECTS = ['Mathématiques', 'Physique-Chimie', 'Français', 'Histoire-Géo', 'Anglais', 'SVT']
const LEVELS = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale', 'Licence', 'Master']

export function Step1ClassInfo({ form }: { form: UseFormReturn<ClassWizardData> }) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Informations de la classe
        </h2>
        <p className="text-gray-600">
          Définissez le contexte pédagogique de votre classe
        </p>
      </div>

      {/* Nom de la classe */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Nom de la classe <span className="text-red-500">*</span>
        </label>
        <input
          {...register('class_name')}
          type="text"
          placeholder="Ex: Terminale HGGSP – Révisions Bac 2025"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {errors.class_name && (
          <p className="text-sm text-red-500 mt-1">{errors.class_name.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Choisissez un nom clair qui aide vos élèves à s'y retrouver
        </p>
      </div>

      {/* Matière et Niveau */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Matière <span className="text-red-500">*</span>
          </label>
          <select
            {...register('subject')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sélectionnez</option>
            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Niveau <span className="text-red-500">*</span>
          </label>
          <select
            {...register('level')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Type de classe */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Type de classe
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => form.setValue('class_type', 'cursus')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              form.watch('class_type') === 'cursus'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-2">📅</div>
            <div className="font-semibold">Cursus régulier</div>
            <div className="text-sm text-gray-600">Cours étalés sur plusieurs mois</div>
          </button>

          <button
            type="button"
            onClick={() => form.setValue('class_type', 'intensive')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              form.watch('class_type') === 'intensive'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-2">⚡</div>
            <div className="font-semibold">Programme intensif</div>
            <div className="text-sm text-gray-600">Stage ou révisions courtes</div>
          </button>
        </div>
      </div>

      {/* Visibilité */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <label className="flex items-start cursor-pointer">
          <input
            type="checkbox"
            {...register('is_public')}
            className="mt-1 mr-3 w-5 h-5 text-blue-600"
          />
          <div>
            <div className="font-medium text-gray-900">Classe publique</div>
            <div className="text-sm text-gray-600 mt-1">
              Si cochée, cette classe sera visible dans le catalogue et les élèves pourront s'inscrire directement.
              Sinon, vous devrez inviter vos élèves manuellement.
            </div>
          </div>
        </label>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-2xl">💡</div>
          <div className="text-sm text-blue-900">
            <strong>Astuce:</strong> Vous pourrez toujours modifier ces informations plus tard.
            L'important est de démarrer avec un cadre clair pour vos élèves.
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### Step 2: Objectifs Pédagogiques

**✅ RÉUTILISER**: `src/components/course-wizard/steps/Step2Objectives.tsx`

**Aucune modification nécessaire!** C'est déjà parfait.

#### Step 3: Premier Cours (Obligatoire)

**Nouveau fichier**: `src/components/class-wizard/steps/Step3FirstCourse.tsx`

```typescript
'use client'

import { UseFormReturn } from 'react-hook-form'
import { ClassWizardData } from '@/lib/validations/class-wizard'

export function Step3FirstCourse({ form }: { form: UseFormReturn<ClassWizardData> }) {
  const { register, formState: { errors } } = form

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Créer le premier cours
        </h2>
        <p className="text-gray-600">
          Chaque classe contient un ou plusieurs cours. Commençons par le premier !
        </p>
      </div>

      {/* Titre du cours */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Titre du cours <span className="text-red-500">*</span>
        </label>
        <input
          {...register('first_course.title')}
          type="text"
          placeholder="Ex: Introduction au programme HGGSP"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        {errors.first_course?.title && (
          <p className="text-sm text-red-500 mt-1">{errors.first_course.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Description courte
        </label>
        <textarea
          {...register('first_course.description')}
          rows={3}
          placeholder="Décrivez brièvement ce que les élèves apprendront dans ce cours..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          Cette description sera visible par vos élèves
        </p>
      </div>

      {/* Gratuit/Payant */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Accessibilité
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => form.setValue('first_course.is_free', true)}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              form.watch('first_course.is_free') === true
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-2">✅</div>
            <div className="font-semibold text-green-700">Gratuit</div>
            <div className="text-sm text-gray-600">Accessible à tous vos élèves</div>
          </button>

          <button
            type="button"
            onClick={() => form.setValue('first_course.is_free', false)}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              form.watch('first_course.is_free') === false
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-2">💳</div>
            <div className="font-semibold text-blue-700">Payant</div>
            <div className="text-sm text-gray-600">Nécessite un paiement</div>
          </button>
        </div>
      </div>

      {/* Message encourageant */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="text-2xl">🎯</div>
          <div className="text-sm text-green-900">
            <strong>Bien joué!</strong> Vous êtes presque prêt.
            À l'étape suivante, vous ajouterez le premier contenu de ce cours.
            Vous pourrez ensuite ajouter d'autres cours à votre classe quand vous voudrez.
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### Step 4: Contenu Initial (MVP)

**Nouveau fichier**: `src/components/class-wizard/steps/Step4Content.tsx`

```typescript
'use client'

import { useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { ClassWizardData } from '@/lib/validations/class-wizard'
import { SimpleTextEditor } from '@/components/editors/SimpleTextEditor'

type ContentType = 'text' | 'video' | 'quiz'

export function Step4Content({
  form,
  onSubmit
}: {
  form: UseFormReturn<ClassWizardData>
  onSubmit: () => void
}) {
  const [contentType, setContentType] = useState<ContentType>('text')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Ajouter le contenu initial
        </h2>
        <p className="text-gray-600">
          Ajoutez le premier élément de contenu pour votre cours
        </p>
      </div>

      {/* Choix type de contenu */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-3">
          Type de contenu
        </label>
        <div className="grid grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setContentType('text')}
            className={`p-4 border-2 rounded-lg text-center transition-all ${
              contentType === 'text'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-3xl mb-2">📝</div>
            <div className="font-semibold">Texte</div>
          </button>

          <button
            type="button"
            onClick={() => setContentType('video')}
            className={`p-4 border-2 rounded-lg text-center transition-all ${
              contentType === 'video'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-3xl mb-2">🎥</div>
            <div className="font-semibold">Vidéo</div>
          </button>

          <button
            type="button"
            onClick={() => setContentType('quiz')}
            className={`p-4 border-2 rounded-lg text-center transition-all ${
              contentType === 'quiz'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-3xl mb-2">❓</div>
            <div className="font-semibold">Quiz</div>
          </button>
        </div>
      </div>

      {/* Éditeur selon type */}
      <div className="border-2 border-gray-200 rounded-lg p-6 min-h-[300px]">
        {contentType === 'text' && (
          <SimpleTextEditor
            value={form.watch('initial_content.content') || ''}
            onChange={(content) => form.setValue('initial_content.content', content)}
          />
        )}

        {contentType === 'video' && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="URL YouTube ou lien vidéo"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              onChange={(e) => {
                form.setValue('initial_content.type', 'video')
                form.setValue('initial_content.content', e.target.value)
              }}
            />
            <p className="text-sm text-gray-500">
              Collez l'URL d'une vidéo YouTube, Vimeo ou autre plateforme
            </p>
          </div>
        )}

        {contentType === 'quiz' && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🚧</div>
            <p>Le créateur de quiz sera disponible à la prochaine étape</p>
            <p className="text-sm mt-2">Pour l'instant, choisissez "Texte" ou "Vidéo"</p>
          </div>
        )}
      </div>

      {/* Message final */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-green-500 rounded-lg p-6">
        <div className="flex gap-4">
          <div className="text-4xl">🎉</div>
          <div>
            <h3 className="font-bold text-lg text-gray-900 mb-2">
              Prêt à créer votre classe!
            </h3>
            <p className="text-gray-700 mb-4">
              Lorsque vous cliquerez sur "Créer la classe", nous allons:
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Créer votre classe avec les informations fournies
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Ajouter automatiquement votre premier cours
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Vous rediriger vers votre classe pour continuer
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**✅ Actions:**
- [ ] Créer les 4 fichiers steps
- [ ] Créer SimpleTextEditor minimum viable (étape suivante)

---

### 🟦 PHASE 4: ÉDITEUR MINIMUM VITAL (2h)

**Installer TipTap:**
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

**Nouveau fichier**: `src/components/editors/SimpleTextEditor.tsx`

```typescript
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

interface SimpleTextEditorProps {
  value: string
  onChange: (content: string) => void
  placeholder?: string
}

export function SimpleTextEditor({
  value,
  onChange,
  placeholder = 'Commencez à écrire...'
}: SimpleTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4'
      }
    }
  })

  if (!editor) {
    return null
  }

  return (
    <div className="border border-gray-300 rounded-lg">
      {/* Toolbar */}
      <div className="border-b border-gray-300 p-2 flex gap-1 bg-gray-50">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded ${
            editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
          }`}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded ${
            editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
          }`}
        >
          <em>I</em>
        </button>
        <div className="w-px bg-gray-300 mx-2" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded ${
            editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
          }`}
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 rounded ${
            editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
          }`}
        >
          1.
        </button>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
```

**✅ Actions:**
- [ ] Installer TipTap
- [ ] Créer SimpleTextEditor.tsx
- [ ] Tester l'éditeur

---

### 🟩 PHASE 5: VALIDATION SCHEMA (1h)

**Nouveau fichier**: `src/lib/validations/class-wizard.ts`

```typescript
import { z } from 'zod'

export const classWizardSchema = z.object({
  // Step 1: Infos de la classe
  class_name: z.string()
    .min(5, 'Le nom doit contenir au moins 5 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),

  subject: z.string().min(1, 'La matière est requise'),

  level: z.enum(['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale', 'Licence', 'Master']),

  class_type: z.enum(['cursus', 'intensive']).default('cursus'),

  is_public: z.boolean().default(false),

  // Step 2: Objectifs (réutiliser du course-wizard)
  learning_objectives: z.array(z.string().min(10, 'Minimum 10 caractères par objectif'))
    .min(3, 'Minimum 3 objectifs')
    .max(5, 'Maximum 5 objectifs'),

  prerequisites: z.array(z.string().min(5, 'Minimum 5 caractères'))
    .max(5, 'Maximum 5 prérequis')
    .optional(),

  // Step 3: Premier cours
  first_course: z.object({
    title: z.string().min(5, 'Le titre doit contenir au moins 5 caractères'),
    description: z.string().optional(),
    is_free: z.boolean().default(true)
  }),

  // Step 4: Contenu initial
  initial_content: z.object({
    type: z.enum(['text', 'video', 'quiz']),
    content: z.string().min(10, 'Ajoutez au moins un peu de contenu')
  })
})

export type ClassWizardData = z.infer<typeof classWizardSchema>
```

**✅ Actions:**
- [ ] Créer class-wizard.ts
- [ ] Valider que les types matchent

---

### 🟩 PHASE 6: BACKEND ADAPTATION (1h)

**Nouveau fichier**: `src/app/api/classes/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()

    // 1. Créer la classroom (= classe)
    const { data: classroom, error: classError } = await supabase
      .from('classrooms')
      .insert({
        teacher_id: user.id,
        title: body.title,
        subject: body.subject,
        level: body.level,
        class_type: body.class_type || 'cursus',
        is_public: body.is_public || false,
        // Pas de price ici, c'est au niveau du cours
      })
      .select()
      .single()

    if (classError) {
      throw classError
    }

    return NextResponse.json(classroom)

  } catch (error: any) {
    console.error('Create class error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création de la classe' },
      { status: 500 }
    )
  }
}
```

**✅ Actions:**
- [ ] Créer route `/api/classes`
- [ ] Tester la création de classe

---

### 🟩 PHASE 7: TESTS & VALIDATION (1h)

**Tests manuels:**

1. **Flow complet**:
   - [ ] Dashboard → Créer une classe
   - [ ] Step 1 → Remplir infos
   - [ ] Step 2 → 3 objectifs
   - [ ] Step 3 → Titre cours
   - [ ] Step 4 → Texte simple
   - [ ] Clic "Créer la classe"
   - [ ] Vérifier redirection
   - [ ] Vérifier classe créée en DB
   - [ ] Vérifier cours initial créé

2. **Navigation**:
   - [ ] Accès direct `/teacher/courses/new` → Bannière redirection
   - [ ] Menu sidebar → Pas de "Cours" visible
   - [ ] Dashboard → Un seul bouton "Créer une classe"

3. **Validation**:
   - [ ] Essayer step suivant sans remplir → Erreurs Zod visibles
   - [ ] Retour arrière → Données conservées
   - [ ] Éditeur TipTap → Bold/Italic fonctionnent

**✅ Actions:**
- [ ] Tester tous les scénarios
- [ ] Corriger bugs trouvés
- [ ] Valider avec 1-2 vrais profs si possible

---

## 📊 RÉSUMÉ ESTIMATIONS

| Phase | Tâche | Temps estimé |
|-------|-------|--------------|
| 0 | Préparation | 30 min |
| 1 | Masquage routes | 1h |
| 2 | Wizard structure | 3h |
| 3 | Steps 1-4 | 2h |
| 4 | Éditeur TipTap | 2h |
| 5 | Validation schema | 1h |
| 6 | Backend API | 1h |
| 7 | Tests | 1h |
| **TOTAL** | | **11h30** |

**Répartition réaliste:**
- Jour 1 (4h): Phases 0-1 + début Phase 2
- Jour 2 (4h): Fin Phase 2 + Phase 3
- Jour 3 (3.5h): Phases 4-7

---

## ✅ CRITÈRES DE SUCCÈS

### Fonctionnel:
- [x] Un seul point d'entrée: "Créer une classe"
- [ ] Wizard 4 steps fonctionnel
- [ ] Backend crée classe + cours initial
- [ ] Redirection vers classe créée

### UX:
- [ ] Aucune confusion visible (pas de choix multiples)
- [ ] Flow linéaire sans interruption
- [ ] Messages clairs à chaque étape
- [ ] Validation en temps réel

### Technique:
- [ ] Zéro rewrite (réutilisation maximale)
- [ ] Ancien système masqué (pas supprimé)
- [ ] Migration future possible
- [ ] Tests passent

---

## 🚀 PRÊT À DÉMARRER

**Commande pour commencer:**
```bash
git checkout -b refactor/ux-class-entry
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
```

**Ordre d'exécution:**
1. Masquer routes confuses (Phase 1)
2. Créer structure wizard (Phase 2)
3. Implémenter steps (Phase 3)
4. Ajouter éditeur (Phase 4)
5. Tester et valider (Phase 7)

**GO! 🎯**
