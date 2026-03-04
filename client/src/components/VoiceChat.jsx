import React, { useEffect, useRef, useState } from 'react'
import SimplePeer from 'simple-peer'

export default function VoiceChat({ socketRef, nickname }) {
  const [muted, setMuted] = useState(true)
  const [localStream, setLocalStream] = useState(null)
  const peersRef = useRef({})
  const audioRefs = useRef({})
  let mounted = true

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return
    mounted = true

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      setLocalStream(stream)

      function handleSignal({ from, signal }) {
        if (!peersRef.current[from]) {
          const peer = new SimplePeer({ initiator: false, trickle: false, stream })
          peer.on('signal', (s) => {
            socket.emit('signal', { to: from, signal: s })
          })
          peer.on('stream', (remoteStream) => {
            attachStream(from, remoteStream)
          })
          peersRef.current[from] = peer
        }
        peersRef.current[from].signal(signal)
      }

      function handleParticipants(list) {
        list.forEach(({ id }) => {
          if (id === socket.id) return
          const peer = new SimplePeer({ initiator: true, trickle: false, stream })
          peer.on('signal', (s) => {
            socket.emit('signal', { to: id, signal: s })
          })
          peer.on('stream', (remoteStream) => {
            attachStream(id, remoteStream)
          })
          peersRef.current[id] = peer
        })
      }

      function handleUserJoined({ id }) {
        if (id === socket.id) return
        const peer = new SimplePeer({ initiator: true, trickle: false, stream })
        peer.on('signal', (s) => {
          socket.emit('signal', { to: id, signal: s })
        })
        peer.on('stream', (remoteStream) => {
          attachStream(id, remoteStream)
        })
        peersRef.current[id] = peer
      }

      function handleUserLeft({ id }) {
        if (peersRef.current[id]) {
          try { peersRef.current[id].destroy(); } catch (e) {}
          delete peersRef.current[id]
        }
        if (audioRefs.current[id]) {
          const el = audioRefs.current[id]
          el.srcObject = null
          try { el.remove(); } catch (e) {}
          delete audioRefs.current[id]
        }
      }

      socket.on('signal', handleSignal)
      socket.on('participants', handleParticipants)
      socket.on('user-joined', handleUserJoined)
      socket.on('user-left', handleUserLeft)

      return () => {
        mounted = false
        socket.off('signal', handleSignal)
        socket.off('participants', handleParticipants)
        socket.off('user-joined', handleUserJoined)
        socket.off('user-left', handleUserLeft)
        for (const id in peersRef.current) {
          try { peersRef.current[id].destroy(); } catch (e) {}
        }
        peersRef.current = {}
      }
    })
  }, [socketRef, localStream])

  function attachStream(id, stream) {
    let audio = audioRefs.current[id]
    if (!audio) {
      audio = document.createElement('audio')
      audio.autoplay = true
      audio.playsInline = true
      audioRefs.current[id] = audio
      document.body.appendChild(audio)
    }
    audio.srcObject = stream
  }

  function toggleMute() {
    if (!localStream) return
    for (const t of localStream.getAudioTracks()) t.enabled = !t.enabled
    setMuted(!muted)
  }

  return (
    <div className="voice">
      <h3>Voice</h3>
      <div className="controls">
        <button onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
        <div className="hint">Note: browser will ask for microphone access. For many participants, use a TURN server in production.</div>
      </div>
    </div>
  )
}
