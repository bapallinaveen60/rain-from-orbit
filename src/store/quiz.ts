import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface QuizState {
  /** answers[quizId][questionIndex] = chosen option index (in source order). */
  answers: Record<string, Record<number, number>>
  answer: (quiz: string, q: number, option: number) => void
  reset: (quiz: string) => void
}

export const useQuizScores = create<QuizState>()(
  persist(
    (set) => ({
      answers: {},
      answer: (quiz, q, option) =>
        set((s) => ({ answers: { ...s.answers, [quiz]: { ...s.answers[quiz], [q]: option } } })),
      reset: (quiz) =>
        set((s) => {
          const rest = { ...s.answers }
          delete rest[quiz]
          return { answers: rest }
        }),
    }),
    { name: 'rfo-quiz' },
  ),
)
