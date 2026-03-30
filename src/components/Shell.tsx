import { NavLink } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import type { PropsWithChildren } from 'react'

import { db } from '@/data/db'

const navItems = [
  { label: 'Capture', to: '/capture' },
  { label: 'Home', to: '/home' },
  { label: 'Report', to: '/report' },
]

export function Shell({ children }: PropsWithChildren) {
  const summary = useLiveQuery(async () => {
    const [latestNote, tasks, executionEvents] = await Promise.all([
      db.rawNotes.orderBy('updatedAt').last(),
      db.tasks.toArray(),
      db.executionEvents.toArray(),
    ])

    const active = tasks.filter((task) => task.status !== 'done').length
    const completed = executionEvents.filter((event) => event.action === 'done').length

    return {
      noteSummary:
        latestNote?.summary ?? 'Nongsha keeps your raw note local, then turns it into a next step.',
      active,
      completed,
    }
  }, [])

  return (
    <div className="shell">
      <div className="shell__glow shell__glow--left" />
      <div className="shell__glow shell__glow--right" />
      <header className="shell__header">
        <div>
          <p className="eyebrow">Idle-Time Action OS</p>
          <h1>Nongsha</h1>
          <p className="lede">{summary?.noteSummary}</p>
        </div>
        <div className="shell__stats">
          <div className="pill">
            <strong>{summary?.active ?? 0}</strong>
            <span>active tasks</span>
          </div>
          <div className="pill pill--warm">
            <strong>{summary?.completed ?? 0}</strong>
            <span>actions completed</span>
          </div>
        </div>
      </header>

      <nav className="shell__nav" aria-label="Primary">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `shell__nav-link${isActive ? ' shell__nav-link--active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="shell__content">{children}</main>
    </div>
  )
}
