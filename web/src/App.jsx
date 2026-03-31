import { useEffect, useState } from 'react'
import { useRef } from 'react'
import lottie from 'lottie-web'
import './App.css'
import aiAnimation from './assets/ai.json'

const API_BASE_URL = 'https://kunaldp379-aiagentsarena.hf.space'

const toApiUrl = (path) => {
  return `${API_BASE_URL}${path}`
}

function App() {
  const [isBackendReady, setIsBackendReady] = useState(false)
  const [showArenaLobby, setShowArenaLobby] = useState(true)
  const [arenas, setArenas] = useState([])
  const [selectedArena, setSelectedArena] = useState(null)
  const [runs, setRuns] = useState([])
  const [isLoadingArenas, setIsLoadingArenas] = useState(false)
  const [isLoadingRuns, setIsLoadingRuns] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showCreateArenaModal, setShowCreateArenaModal] = useState(false)
  const [arenaForm, setArenaForm] = useState({
    name: '',
    creator_name: '',
    description: '',
    image_url: '',
  })
  const animationContainerRef = useRef(null)
  const arenaLoadingAnimationRef = useRef(null)

  const loadArenas = async () => {
    setIsLoadingArenas(true)
    setErrorMessage('')

    try {
        const response = await fetch(toApiUrl('/api/arenas'), {
        method: 'GET',
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Failed to load arenas (${response.status})`)
      }

      const data = await response.json()
      const nextArenas = data.arenas ?? []
      setArenas(nextArenas)

      if (nextArenas.length > 0) {
        setSelectedArena((prev) => prev ?? nextArenas[0])
      } else {
        setSelectedArena(null)
        setRuns([])
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load arenas')
    } finally {
      setIsLoadingArenas(false)
    }
  }

  useEffect(() => {
    if (isBackendReady) {
      return undefined
    }

    let intervalId = null
    let isMounted = true

    const checkBackend = async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2500)

      try {
        const response = await fetch(toApiUrl('/backend-check'), {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        })

        if (response.ok) {
          if (isMounted) {
            setIsBackendReady(true)
          }

          if (intervalId) {
            clearInterval(intervalId)
          }
          return
        }

        throw new Error('Backend not ready')
      } catch {
        try {
          // Fallback when /backend-check is unavailable; probe root.
          await fetch(toApiUrl('/'), {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            signal: controller.signal,
          })

          if (isMounted) {
            setIsBackendReady(true)
          }

          if (intervalId) {
            clearInterval(intervalId)
          }
        } catch {
          // Keep showing animation and retry.
        }
      } finally {
        clearTimeout(timeoutId)
      }
    }

    checkBackend()
    intervalId = setInterval(checkBackend, 1500)

    return () => {
      isMounted = false
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isBackendReady])

  useEffect(() => {
    if (!animationContainerRef.current || isBackendReady) {
      return undefined
    }

    const animationInstance = lottie.loadAnimation({
      container: animationContainerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: aiAnimation,
    })

    return () => {
      animationInstance.destroy()
    }
  }, [isBackendReady])

  useEffect(() => {
    if (!isLoadingArenas || !arenaLoadingAnimationRef.current) {
      return undefined
    }

    const loadingAnimation = lottie.loadAnimation({
      container: arenaLoadingAnimationRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: aiAnimation,
    })

    return () => {
      loadingAnimation.destroy()
    }
  }, [isLoadingArenas])

  useEffect(() => {
    if (!isBackendReady) {
      return
    }

    loadArenas()
  }, [isBackendReady])

  useEffect(() => {
    if (!selectedArena?.id) {
      return
    }

    const loadRuns = async () => {
      setIsLoadingRuns(true)
      setErrorMessage('')

      try {
        const response = await fetch(toApiUrl(`/api/arenas/${selectedArena.id}/runs`), {
          method: 'GET',
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Failed to load arena runs (${response.status})`)
        }

        const data = await response.json()
        setRuns(data.runs ?? [])
      } catch (error) {
        setErrorMessage(error.message || 'Unable to load arena runs')
      } finally {
        setIsLoadingRuns(false)
      }
    }

    loadRuns()
  }, [selectedArena])

  const latestResult = runs[0]?.result
  const chatEvents = latestResult?.chat_events ?? []
  const teamA = latestResult?.teams?.team_a ?? []
  const teamB = latestResult?.teams?.team_b ?? []
  const judgeThoughts = latestResult?.judge_thoughts ?? []
  const scoreA = Number(latestResult?.scores?.team_a ?? 0).toFixed(1)
  const scoreB = Number(latestResult?.scores?.team_b ?? 0).toFixed(1)
  const toCoverUrl = (arena) => {
    const raw = (arena?.image_url || arena?.imageUrl || '').trim()
    if (!raw) {
      return ''
    }

    const lower = raw.toLowerCase()
    const isDirectImage = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'].some(
      (ext) => lower.includes(ext)
    )

    if (isDirectImage) {
      return raw
    }

    return `https://image.thum.io/get/width/900/noanimate/${encodeURIComponent(
      raw
    )}`
  }

  const handleCreateArena = async () => {
    if (!arenaForm.name.trim() || !arenaForm.creator_name.trim()) {
      setErrorMessage('Arena name and creator name are required.')
      return
    }

    setErrorMessage('')
    try {
      const response = await fetch(toApiUrl('/api/arenas'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: arenaForm.name.trim(),
          creator_name: arenaForm.creator_name.trim(),
          description: arenaForm.description.trim(),
          image_url: arenaForm.image_url.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create arena (${response.status})`)
      }

      setShowCreateArenaModal(false)
      setArenaForm({ name: '', creator_name: '', description: '', image_url: '' })
      await loadArenas()
    } catch (error) {
      setErrorMessage(error.message || 'Unable to create arena')
    }
  }

  return (
    <main className="app-shell">
      {!isBackendReady ? (
        <section className="loader-screen">
          <div className="lottie-wrap">
            <div ref={animationContainerRef} className="lottie-container" />
          </div>
          <p className="loader-title">Spinning up AI agents server</p>
          <p className="loader-subtitle">Please wait...</p>
        </section>
      ) : (
        <>
          <section className="main-layout">
            <section className="panel">
              <div className="panel-header">
                <h1>Agents Battleground</h1>
                <span className="badge">debate simulator</span>
              </div>
              <p className="muted">
                Two AI teams argue in a dark room, roast each other a bit, a
                silent judge keeps score, then a winner walks out.
              </p>

              <div className="form-group">
                <label>Debate Topic</label>
                <input placeholder="e.g. Should AI replace coding interviews?" />
              </div>
              <div className="form-group">
                <label>Rounds and Squad Size</label>
                <div className="row">
                  <select defaultValue="2">
                    <option value="1">1 round</option>
                    <option value="2">2 rounds</option>
                    <option value="3">3 rounds</option>
                    <option value="4">4 rounds</option>
                  </select>
                  <select defaultValue="3">
                    <option value="3">3 per team</option>
                    <option value="2">2 per team</option>
                    <option value="4">4 per team</option>
                  </select>
                </div>
              </div>
              <div className="row action-row">
                <button type="button">Run Debate</button>
                <button type="button" className="ghost-btn-inline">
                  Stop Stream
                </button>
              </div>

              <div className="profile-chip">
                {selectedArena
                  ? `Arena: ${selectedArena.name}`
                  : 'Arena not selected'}
              </div>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowArenaLobby(true)}
              >
                Open Arena Lobby
              </button>

              <div className="split">
                <div className="team-card team-a-card">
                  <div className="team-title">Team A</div>
                  <div className="team-sub">Argues for the topic</div>
                  <div className="team-list">
                    {teamA.length === 0 ? (
                      <div>Waiting for agents...</div>
                    ) : (
                      teamA.map((member) => (
                        <div key={`${member.name}-${member.role}`} className="member-row">
                          <div className="member-name">{member.name}</div>
                          <div className="member-role">{member.role}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="team-card team-b-card">
                  <div className="team-title">Team B</div>
                  <div className="team-sub">Argues against the topic</div>
                  <div className="team-list">
                    {teamB.length === 0 ? (
                      <div>Waiting for agents...</div>
                    ) : (
                      teamB.map((member) => (
                        <div key={`${member.name}-${member.role}`} className="member-row">
                          <div className="member-name">{member.name}</div>
                          <div className="member-role">{member.role}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="chat-panel">
                <div className="chat-header">
                  <h2>Debate Log</h2>
                  <span className="chat-badge">
                    {isLoadingRuns ? 'Loading' : 'Idle'}
                  </span>
                </div>
                <div className="timeline">
                  <div className="timeline-event">
                    {selectedArena
                      ? `Loaded arena: ${selectedArena.name}`
                      : 'Select arena from lobby'}
                  </div>
                </div>
                <div className="chat-stream">
                  {chatEvents.length === 0 ? (
                    <div className="msg">
                      <div className="msg-meta">No messages yet</div>
                      <div>Run history will appear here.</div>
                    </div>
                  ) : (
                    chatEvents.slice(0, 20).map((msg, index) => (
                      <div key={`${msg.speaker}-${index}`} className={`msg ${msg.team || ''}`}>
                        <div className="msg-meta">
                          <span className="speaker-name">{msg.speaker}</span>{' '}
                          <span className="speaker-role">({msg.role})</span>
                        </div>
                        <div>{msg.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="judge-grid">
                <div className="judge-thoughts">
                  <div className="team-title thoughts-title">Judge's Headspace</div>
                  {judgeThoughts.length === 0 ? (
                    <div className="judge-empty">No thoughts yet. Start a debate.</div>
                  ) : (
                    judgeThoughts.slice(0, 8).map((thought, index) => (
                      <div key={`${thought.title}-${index}`} className="judge-card">
                        <div className="judge-card-title">{thought.title}</div>
                        <div className="judge-card-text">{thought.thought}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="result-card">
                  <div className="team-title thoughts-title">Final Verdict</div>
                  <div>
                    <span className="score-pill">
                      <strong>A</strong> {scoreA}
                    </span>
                    <span className="score-pill">
                      <strong>B</strong> {scoreB}
                    </span>
                    <span className="score-pill winner-pill">
                      Winner: {latestResult?.winner || '-'}
                    </span>
                  </div>
                  <div className="result-text">
                    {latestResult?.judge_summary || 'Judge summary will appear here.'}
                  </div>
                </div>
              </div>
            </section>
          </section>

          <div
            className="arena-backdrop"
            style={{ display: showArenaLobby ? 'flex' : 'none' }}
          >
            <div className="arena-modal">
              <div className="arena-shell">
                <div className="arena-actions">
                  <div className="arena-lobby-title">Arena Lobby</div>
                  <button
                    type="button"
                    className="white-btn"
                    onClick={() => setShowCreateArenaModal(true)}
                  >
                    Create Arena
                  </button>
                </div>

                {errorMessage ? <p className="error-text">{errorMessage}</p> : null}

                {isLoadingArenas ? (
                  <div className="arena-loading">
                    <div ref={arenaLoadingAnimationRef} className="arena-loading-lottie" />
                    <div className="arena-loading-text">Loading arenas</div>
                  </div>
                ) : null}

                <div className="arena-list">
                  {arenas.map((arena) => (
                    <div key={arena.id} className="arena-item">
                      <div className="arena-inner">
                        {toCoverUrl(arena) ? (
                          <img
                            className="arena-cover"
                            src={toCoverUrl(arena)}
                            alt={arena.name}
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : null}
                        <div className="arena-meta">
                          <div className="member-name">{arena.name}</div>
                          <div className="arena-creator">by {arena.creator_name}</div>
                        </div>
                        <div className="arena-desc">
                          Description: {arena.description || 'No description'}
                        </div>
                        <button
                          type="button"
                          className="join-btn white-btn"
                          onClick={() => {
                            setSelectedArena(arena)
                            setShowArenaLobby(false)
                          }}
                        >
                          Join Arena
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {showCreateArenaModal ? (
            <div className="create-arena-backdrop">
              <div className="create-arena-modal">
                <div className="panel-header">
                  <h1 className="create-arena-title">Create Arena</h1>
                  <span className="badge">new</span>
                </div>

                <div className="form-group">
                  <label>Arena Name</label>
                  <input
                    value={arenaForm.name}
                    onChange={(event) =>
                      setArenaForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="e.g. Political Battle"
                  />
                </div>
                <div className="form-group">
                  <label>Creator Name</label>
                  <input
                    value={arenaForm.creator_name}
                    onChange={(event) =>
                      setArenaForm((prev) => ({
                        ...prev,
                        creator_name: event.target.value,
                      }))
                    }
                    placeholder="e.g. Kunal Patil"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input
                    value={arenaForm.description}
                    onChange={(event) =>
                      setArenaForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Choosing the parties, BJP or Congress"
                  />
                </div>
                <div className="form-group">
                  <label>Image URL (optional)</label>
                  <input
                    value={arenaForm.image_url}
                    onChange={(event) =>
                      setArenaForm((prev) => ({
                        ...prev,
                        image_url: event.target.value,
                      }))
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="row action-row">
                  <button type="button" className="white-btn" onClick={handleCreateArena}>
                    Create
                  </button>
                  <button
                    type="button"
                    className="ghost-btn-inline"
                    onClick={() => setShowCreateArenaModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </main>
  )
}

export default App
