import React, { useEffect, useState } from 'react'

function StatusCard({ title, children, loading, error }) {
  return (
    <div className="card top-card">
      <header className="card-header">
        <p className="card-header-title">{title}</p>
      </header>
      <div className="card-content">
        {loading && <p>Loading...</p>}
        {error && <p className="has-text-danger">{error}</p>}
        {!loading && !error && children}
      </div>
    </div>
  )
}

function renderDuolingo(duo) {
  if (!duo) return <p>No Duolingo data available.</p>
  const user = duo.profile ?? duo.users?.[0] ?? duo
  if (!user) return <p>Duolingo user data not available.</p>
  const streak = user?.streak ?? user?.site_streak
  const streakStart = user?.streakData?.currentStreak?.startDate
  const totalXp = user?.totalXp ?? user?.total_xp ?? user?.site_xp
  const courses = user?.courses ?? []
  const topCourses = courses
    .slice()
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
    .slice(0, 3)
  const maxXp = topCourses.reduce((max, course) => Math.max(max, course.xp || 0), 0) || 1

  return (
    <>
      <p className="is-size-7">User: {user?.username}</p>
      <div className="content">
        <p><strong>Streak:</strong> {streak ?? 'N/A'}</p>
        {streakStart ? <p><strong>Streak started:</strong> {new Date(streakStart).toLocaleDateString()}</p> : null}
        <p><strong>Total XP:</strong> {totalXp ?? 'N/A'}</p>
        <p><strong>Languages:</strong> {courses.length}</p>
      </div>
      {topCourses.length ? (
        <div className="content">
          <p><strong>Top courses</strong></p>
          {topCourses.map(course => {
            const crownText = course.crowns === 9999 ? '' : ` — ${course.crowns} crowns`
            const percent = Math.round(((course.xp || 0) / maxXp) * 100)
            return (
              <div key={course.id} className="mb-4">
                <div className="course-progress">
                  <p>{course.title}{crownText}</p>
                  <p>{course.xp?.toLocaleString() ?? 0} XP</p>
                </div>
                <progress className="progress is-primary" value={percent} max="100">{percent}%</progress>
              </div>
            )
          })}
        </div>
      ) : null}
    </>
  )
}

function renderGithub(gh) {
  if (!gh) return <p>No GitHub data available.</p>
  const profile = gh.profile || gh
  const aggregates = gh.aggregates || {}
  const languageTotal = aggregates.topLanguages?.reduce((sum, item) => sum + item.count, 0) || 0

  return (
    <>
      <p className="is-size-7">User: {profile.login}</p>
      <div className="content">
        {profile.bio ? <p><strong>Bio:</strong> {profile.bio}</p> : null}
        <p><strong>Repos:</strong> {aggregates.repoCount ?? profile.public_repos} (public)</p>
        <p><strong>Followers:</strong> {profile.followers}</p>
        <p><strong>Following:</strong> {profile.following}</p>
        <p><strong>Joined:</strong> {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</p>
        <p><strong>Total stars:</strong> {aggregates.totalStars ?? 'N/A'}</p>
        <p><strong>Total forks:</strong> {aggregates.totalForks ?? 'N/A'}</p>
        <p><strong>PRs authored:</strong> {gh.prCount ?? 'N/A'}</p>
        <p><strong>Merged PRs:</strong> {gh.mergedPrCount ?? 'N/A'}</p>
      </div>

      {aggregates.topLanguages?.length ? (
        <div className="content">
          <p><strong>Top languages</strong></p>
          {aggregates.topLanguages.map(lang => {
            const percent = languageTotal ? Math.round((lang.count / languageTotal) * 100) : 0
            return (
              <div key={lang.language} className="mb-3">
                <div className="is-flex is-justify-content-space-between">
                  <span>{lang.language}</span>
                  <span>{lang.count} repos</span>
                </div>
                <progress className="progress is-primary" value={percent} max="100">{percent}%</progress>
              </div>
            )
          })}
        </div>
      ) : null}

      {aggregates.topRepos?.length ? (
        <div className="content">
          <p><strong>Top repositories</strong></p>
          <ul>
            {aggregates.topRepos.map(repo => (
              <li key={repo.name} className="mb-2">
                <a href={repo.url} target="_blank" rel="noreferrer">{repo.name}</a>
                {repo.language ? ` — ${repo.language}` : ''}
                <br />
                <small>{repo.description || 'No description'}</small>
                <br />
                <span className="tag is-info is-light">★ {repo.stars}</span>
                <span className="tag is-link is-light">🍴 {repo.forks}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {aggregates.recentRepos?.length ? (
        <div className="content">
          <p><strong>Recent repo contributions (public ones)</strong></p>
          <p>Active repos (30 days): <strong>{aggregates.active30}</strong></p>
          <p>Active repos (90 days): <strong>{aggregates.active90}</strong></p>
          <ul>
            {aggregates.recentRepos.map(repo => (
              <li key={repo.name} className="mb-2">
                <a href={repo.url} target="_blank" rel="noreferrer">{repo.name}</a>
                {repo.language ? ` — ${repo.language}` : ''}
                <br />
                <small>Updated {new Date(repo.pushed_at).toLocaleDateString()}</small>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}

const loadJson = async url => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`)
  }
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(`${url}: expected JSON but got ${contentType}`)
  }
  return response.json()
}

export default function App() {
  const [duo, setDuo] = useState(null)
  const [gh, setGh] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadJson('/data/duolingo.json')
      .then(setDuo)
      .catch(err => setErrors(prev => ({ ...prev, duolingo: err.message })))
    loadJson('/data/github.json')
      .then(setGh)
      .catch(err => setErrors(prev => ({ ...prev, github: err.message })))
  }, [])

  const loading = { duolingo: !duo && !errors.duolingo, github: !gh && !errors.github }

  return (
    <>
      <nav className="navbar is-white" role="navigation" aria-label="main navigation">
        <div className="container">
          <div className="navbar-brand">
            <a className="navbar-item" href="https://alexis-carbillet.com" target="_blank" rel="noreferrer">
              main website
            </a>
          </div>
        </div>
      </nav>

      <section className="section">
        <div className="container">
          <div className="box">
            <p className="subtitle">Live stats from my public Duolingo and GitHub data</p>
          </div>

          <div className="columns is-multiline">
            <div id="duolingo" className="column is-half">
              <StatusCard title="Duolingo" loading={loading.duolingo} error={errors.duolingo}>
                {renderDuolingo(duo)}
              </StatusCard>
            </div>

            <div id="github" className="column is-half">
              <StatusCard title="GitHub" loading={loading.github} error={errors.github}>
                {renderGithub(gh)}
              </StatusCard>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="content has-text-centered">
          <p>
            <strong>stats.alexis-carbillet.com</strong> — built with public Duolingo and GitHub profile data.
            <br />
            <a href="https://alexis-carbillet.com" target="_blank" rel="noreferrer">alexis-carbillet.com</a>
          </p>
        </div>
      </footer>
    </>
  )
}
