import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import './chat.css';

const socket = io(`${process.env.REACT_APP_CHAT_URL || 'http://localhost:5000'}`); // Conecta ao servidor backend

function Chat({ userId, receiverId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');

  useEffect(() => {
    // Associa o usuário ao ID do socket
    socket.emit('join', { userId });

    // Recebe mensagens em tempo real
    socket.on('receiveMessage', ({ senderId, message }) => {
      setMessages((prevMessages) => [...prevMessages, { senderId, text: message }]);
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      setMessages((prevMessages) => [...prevMessages, { senderId: userId, text: inputMessage }]);
      socket.emit('sendMessage', { senderId: userId, receiverId, message: inputMessage });
      setInputMessage('');
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Chat</h2>
      </div>
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.senderId === userId ? 'sent' : 'received'}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Digite sua mensagem..."
        />
        <button className="button-chat" type="submit">Enviar</button>
      </form>
    </div>
  );
}

export default Chat;
