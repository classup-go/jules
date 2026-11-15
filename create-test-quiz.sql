-- ============================================================================
-- CRÉER UN QUIZ DE TEST
-- ============================================================================
-- Date: 2026-01-24
-- Purpose: Créer un quiz de test pour vérifier le système
-- ============================================================================

-- ============================================================================
-- 1. TROUVER UNE LEÇON EXISTANTE
-- ============================================================================

-- Voir toutes les leçons disponibles
SELECT
  l.id,
  l.title,
  l.type,
  c.title as chapter_title,
  cl.title as classroom_title
FROM lessons l
JOIN chapters c ON c.id = l.chapter_id
JOIN courses co ON co.id = c.course_id
JOIN classrooms cl ON cl.id = co.classroom_id
ORDER BY l.created_at DESC
LIMIT 10;

-- ============================================================================
-- 2. CRÉER UN QCM DE TEST (Option 1)
-- ============================================================================
-- ⚠️ Remplacez 'VOTRE_LESSON_ID' par un vrai ID de leçon ci-dessus

/*
-- Exemple: Créer un QCM simple
INSERT INTO lesson_quizzes (lesson_id, quiz_type, data) VALUES (
  'VOTRE_LESSON_ID_ICI',  -- Remplacez par un vrai lesson_id
  'qcm',
  '{
    "title": "Quiz de Test - Mathématiques",
    "description": "Quiz de test pour valider le système",
    "questions": [
      {
        "id": "q1",
        "question": "Combien font 2 + 2 ?",
        "points": 1,
        "answers": [
          {"id": "a1", "text": "3", "isCorrect": false},
          {"id": "a2", "text": "4", "isCorrect": true},
          {"id": "a3", "text": "5", "isCorrect": false}
        ]
      },
      {
        "id": "q2",
        "question": "Quelle est la racine carrée de 16 ?",
        "points": 1,
        "answers": [
          {"id": "a1", "text": "2", "isCorrect": false},
          {"id": "a2", "text": "4", "isCorrect": true},
          {"id": "a3", "text": "8", "isCorrect": false}
        ]
      },
      {
        "id": "q3",
        "question": "10 ÷ 2 = ?",
        "points": 1,
        "answers": [
          {"id": "a1", "text": "5", "isCorrect": true},
          {"id": "a2", "text": "2", "isCorrect": false},
          {"id": "a3", "text": "20", "isCorrect": false}
        ]
      }
    ],
    "passingScore": 60,
    "randomizeQuestions": false,
    "randomizeAnswers": false,
    "showCorrectAnswers": true,
    "allowRetry": true
  }'::jsonb
)
RETURNING id, lesson_id, quiz_type, data->>'title' as title;
*/

-- ============================================================================
-- 3. CRÉER UN TEXTE À TROU DE TEST (Option 2)
-- ============================================================================
-- ⚠️ Remplacez 'VOTRE_LESSON_ID' par un vrai ID de leçon

/*
-- Exemple: Créer un texte à trou
INSERT INTO lesson_quizzes (lesson_id, quiz_type, data) VALUES (
  'VOTRE_LESSON_ID_ICI',  -- Remplacez par un vrai lesson_id
  'fill_in_blanks',
  '{
    "title": "Exercice de Test - Géographie",
    "description": "Exercice de test pour valider le système",
    "text": "La capitale de la France est {{1}}. Elle compte environ {{2}} millions d'\''habitants. Le fleuve qui traverse Paris s'\''appelle {{3}}.",
    "blanks": [
      {
        "id": "b1",
        "position": 1,
        "correctAnswers": ["Paris", "paris"],
        "hint": "Ville lumière",
        "points": 1
      },
      {
        "id": "b2",
        "position": 2,
        "correctAnswers": ["2", "2.2", "deux"],
        "hint": "Entre 2 et 3 millions",
        "points": 1
      },
      {
        "id": "b3",
        "position": 3,
        "correctAnswers": ["Seine", "La Seine", "la seine", "la Seine"],
        "hint": "Commence par S",
        "points": 1
      }
    ],
    "caseSensitive": false,
    "acceptSynonyms": true,
    "showHints": true,
    "passingScore": 60,
    "allowRetry": true
  }'::jsonb
)
RETURNING id, lesson_id, quiz_type, data->>'title' as title;
*/

-- ============================================================================
-- 4. VÉRIFIER QUE LE QUIZ A ÉTÉ CRÉÉ
-- ============================================================================

-- Voir tous les quiz créés
SELECT
  lq.id,
  lq.quiz_type,
  lq.data->>'title' as quiz_title,
  lq.data->>'passingScore' as passing_score,
  l.title as lesson_title,
  lq.created_at
FROM lesson_quizzes lq
JOIN lessons l ON l.id = lq.lesson_id
ORDER BY lq.created_at DESC;

-- ============================================================================
-- 5. METTRE À JOUR LE TYPE DE LA LEÇON (Important!)
-- ============================================================================
-- ⚠️ Pour que le quiz soit accessible, il faut mettre à jour le type de la leçon

/*
-- Mettre à jour le type de la leçon pour correspondre au quiz
UPDATE lessons
SET type = 'qcm'  -- ou 'fill_in_blanks' selon votre quiz
WHERE id = 'VOTRE_LESSON_ID_ICI';
*/

-- ============================================================================
-- RÉSUMÉ
-- ============================================================================

SELECT '✅ Exécutez les étapes suivantes:' as instruction
UNION ALL SELECT '1. Copiez un lesson_id de la première requête'
UNION ALL SELECT '2. Décommentez et remplacez VOTRE_LESSON_ID_ICI dans l''INSERT'
UNION ALL SELECT '3. Exécutez l''INSERT pour créer le quiz'
UNION ALL SELECT '4. Décommentez et exécutez l''UPDATE pour changer le type de leçon'
UNION ALL SELECT '5. Testez dans l''interface en vous connectant comme étudiant';

-- ============================================================================
-- FIN
-- ============================================================================
