import React, { useEffect, useState, useRef } from 'react'

export default function Chat({ socketRef, nickname }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const onMsg = (msg) => {
      setMessages(m => [...m, msg])
      // scroll
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50)
    }

    socket.on('chat-message', onMsg)

    return () => socket.off('chat-message', onMsg)
  }, [socketRef])

  function send() {
    if (!text.trim()) return
    const socket = socketRef.current
    if (!socket) return
    socket.emit('chat-message', text)
    setText('')
  }

  return (
    <div className="chat">
      <h3>Chat</h3>
      <div className="messages" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className="msg">
            <div className="meta"><strong>{m.nickname}</strong> <span className="time">{new Date(m.ts).toLocaleTimeString()}</span></div>
            <div className="txt">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send() }} placeholder="Say something..." />
        <button onClick={send}>Send</button>
      </div>
    </div>
  )
}