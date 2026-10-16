import { useMemo } from 'react'
import { quizzes, type QuizItem } from '../../data/quizzes'
import { useQuizScores } from '../../store/quiz'

const LETTERS = 'ABCD'

/** Deterministic per-question shuffle: the source data always lists the right answer first. */
function order(q: QuizItem): number[] {
  let h = 2166136261
  for (const ch of q.s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const idx = q.o.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
    const j = h % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

export function Question({ q, picked, onPick }: { q: QuizItem; picked?: number; onPick: (o: number) => void }) {
  const ord = useMemo(() => order(q), [q])
  const done = picked !== undefined
  const shownRight = ord.indexOf(q.c)
  return (
    <div className="q">
      <p className="stem">{q.s}</p>
      <div className="opts">
        {ord.map((oi, pos) => {
          const state = !done ? '' : oi === q.c ? ' right' : oi === picked ? ' wrong' : ''
          return (
            <button
              key={oi}
              type="button"
              className={'opt' + state}
              disabled={done}
              style={done && !state ? { opacity: 0.5 } : undefined}
              onClick={() => onPick(oi)}
            >
              <span className="mk">{LETTERS[pos]}</span>
              <span>{q.o[oi]}</span>
            </button>
          )
        })}
      </div>
      {done && (
        <div className="fb" role="status">
          <b>{picked === q.c ? 'SPLAT — correct.' : `Not this one. The answer is ${LETTERS[shownRight]}.`}</b> {q.e}
        </div>
      )}
    </div>
  )
}

/** A chapter self-check. Answers are remembered between visits. */
export function Quiz({ id }: { id: string }) {
  const items = quizzes[id] ?? []
  const answers = useQuizScores((s) => s.answers[id]) ?? {}
  const answer = useQuizScores((s) => s.answer)
  const reset = useQuizScores((s) => s.reset)

  const done = Object.keys(answers).length
  const right = items.filter((q, i) => answers[i] === q.c).length

  return (
    <div className="quiz">
      {items.map((q, i) => (
        <Question key={i} q={q} picked={answers[i]} onPick={(o) => answer(id, i, o)} />
      ))}
      <p className="psst">
        {done === 0 ? (
          `Answer all ${items.length} to finish the chapter.`
        ) : (
          <>
            {right} of {done} correct{done === items.length && <b> — chapter complete!</b>}{' '}
            <button type="button" className="btn" onClick={() => reset(id)}>
              Try again
            </button>
          </>
        )}
      </p>
    </div>
  )
}
