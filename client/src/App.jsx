import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client'
import Chat from './components/Chat'
import VoiceChat from './components/VoiceChat'

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export default function App() {
  const [nickname, setNickname] = useState('')
  const [roomId, setRoomId] = useState('')
  const [joined, setJoined] = useState(false)
  const [participants, setParticipants] = useState([])
  const socketRef = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const r = params.get('room')
    if (r) setRoomId(r)
  }, [])

  function join() {
    if (!roomId.trim()) return
    const socket = io()
    socketRef.current = socket

    socket.emit('join-room', { roomId, nickname })
    setJoined(true)

    socket.on('participants', (list) => setParticipants(list))

    socket.on('user-joined', (user) => {
      setParticipants((p) => [...p, user])
    })

    socket.on('user-left', ({ id }) => {
      setParticipants((p) => p.filter(x => x.id !== id))
    })

    return () => socket.disconnect()
  }

  return (
    <div className="app-root">
      {!joined ? (
        <div className="login-modal">
          <h2>Join watch party</h2>
          <label>
            Nickname:
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. sam" />
          </label>
          <label>
            Room id:
            <input value={roomId} onChange={(e) => setRoomId(e.target.value)} />
          </label>
          <button onClick={join}>Join</button>
          <p className="hint">Open the same URL in another tab or share `?room={roomId}` to invite</p>
        </div>
      ) : (
        <div className="layout">
          <main className="video-col">
            <div className="iframe-wrap">
              {/* user-provided iframe */}
              <iframe
                title="New Zealand Cricket vs South Africa Cricket Player"
                marginHeight="0"
                marginWidth="0"
                src="https://embedsports.top/embed/echo/t20-world-cup-semi-final-south-africa-vs-new-zealand-cricket-1/1"
                scrolling="no"
                allowFullScreen
                allow="encrypted-media; picture-in-picture; microphone"
              />
            </div>
            <div className="participants">
              <h4>Participants ({participants.length + 1})</h4>
              <ul>
                <li><strong>{escapeHtml(nickname)}</strong> (you)</li>
                {participants.map(p => (
                  <li key={p.id}>{escapeHtml(p.nickname || 'guest')}</li>
                ))}
              </ul>
            </div>
          </main>

          <aside className="aside-col">
            <Chat socketRef={socketRef} nickname={nickname} />
            <VoiceChat socketRef={socketRef} nickname={nickname} />
          </aside>
        </div>
      )}
    </div>
  )
}
