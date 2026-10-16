import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Question } from '../components/book/Quiz'
import { chapters, pathOf } from '../content/chapters'
import { quizzes } from '../data/quizzes'
import { useQuizScores } from '../store/quiz'

interface Missed {
  quiz: string
  i: number
}

/** Self-check questions answered wrong anywhere in the book, to try again. */
export function ReviewPage() {
  const answers = useQuizScores((s) => s.answers)
  const answer = useQuizScores((s) => s.answer)
  // Fixed at arrival, so a question answered right stays on screen with its feedback.
  const [missed] = useState<Missed[]>(() =>
    Object.entries(answers).flatMap(([quiz, a]) =>
      Object.entries(a)
        .filter(([i, o]) => quizzes[quiz]?.[+i] && o !== quizzes[quiz][+i].c)
        .map(([i]) => ({ quiz, i: +i })),
    ),
  )
  const [retried, setRetried] = useState<Record<string, number>>({})

  useEffect(() => {
    document.title = 'Review · Rain from Orbit'
    window.scrollTo(0, 0)
  }, [])

  const answeredCount = Object.values(answers).reduce((n, a) => n + Object.keys(a).length, 0)
  const total = Object.values(quizzes).reduce((n, q) => n + q.length, 0)
  const fixed = missed.filter((m) => retried[`${m.quiz}-${m.i}`] === quizzes[m.quiz][m.i].c).length

  return (
    <div className="wrap">
      <h3 className="ph blue">Review</h3>
      <div className="pgrid one">
        <div className="pbox plain">
          <p>
            You have answered <b>{answeredCount}</b> of {total} self-check questions.{' '}
            {missed.length === 0
              ? answeredCount === 0
                ? 'Answer some at the end of each chapter, and any you miss will collect here.'
                : 'Nothing to review — every answer so far was right.'
              : `${missed.length} missed ${missed.length === 1 ? 'question' : 'questions'} below${fixed ? ` — ${fixed} put right` : ''}.`}
          </p>
        </div>
        {missed.length > 0 && (
          <div className="quiz">
            {missed.map((m) => {
              const n = Number(m.quiz.replace('ch', ''))
              const key = `${m.quiz}-${m.i}`
              return (
                <div key={key}>
                  <p className="psst" style={{ margin: '0 0 4px' }}>
                    From{' '}
                    <Link to={pathOf({ ch: n, pg: chapters[n - 1].pages.length })}>
                      Chapter {n}: {chapters[n - 1].title}
                    </Link>
                  </p>
                  <Question
                    q={quizzes[m.quiz][m.i]}
                    picked={retried[key]}
                    onPick={(o) => {
                      setRetried((r) => ({ ...r, [key]: o }))
                      answer(m.quiz, m.i, o)
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
