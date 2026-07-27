import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

var mockEmit = jest.fn();
var mockOn = jest.fn();
var mockDisconnect = jest.fn();

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    emit: (...args) => mockEmit(...args),
    on: (...args) => mockOn(...args),
    disconnect: (...args) => mockDisconnect(...args),
  })),
}));

import Chat from './chat';

describe('Chat Component', () => {
  beforeEach(() => {
    mockEmit.mockClear();
    mockOn.mockClear();
    mockDisconnect.mockClear();
  });

  test('Renderiza o componente Chat e se conecta via socket.io', () => {
    render(<Chat userId="user1" receiverId="pass1" />);

    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(mockEmit).toHaveBeenCalledWith('join', { userId: 'user1' });
    expect(mockOn).toHaveBeenCalledWith('receiveMessage', expect.any(Function));
  });

  test('Envia mensagem quando o formulário é submetido com texto', () => {
    render(<Chat userId="user1" receiverId="pass1" />);

    const input = screen.getByPlaceholderText('Digite sua mensagem...');
    fireEvent.change(input, { target: { value: 'Olá passeador!' } });

    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    expect(mockEmit).toHaveBeenCalledWith('sendMessage', {
      senderId: 'user1',
      receiverId: 'pass1',
      message: 'Olá passeador!',
    });
    expect(screen.getByText('Olá passeador!')).toBeInTheDocument();
    expect(input.value).toBe('');
  });

  test('Não envia mensagem se o input estiver em branco', () => {
    render(<Chat userId="user1" receiverId="pass1" />);

    const input = screen.getByPlaceholderText('Digite sua mensagem...');
    fireEvent.change(input, { target: { value: '   ' } });

    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));

    expect(mockEmit).not.toHaveBeenCalledWith('sendMessage', expect.anything());
  });

  test('Recebe mensagem em tempo real do evento receiveMessage', async () => {
    render(<Chat userId="user1" receiverId="pass1" />);

    const [[, receiveHandler]] = mockOn.mock.calls.filter(call => call[0] === 'receiveMessage');

    act(() => {
      receiveHandler({ senderId: 'pass1', message: 'Oi cliente!' });
    });

    await waitFor(() => {
      expect(screen.getByText('Oi cliente!')).toBeInTheDocument();
    });
  });

  test('Desconecta o socket ao desmontar o componente', () => {
    const { unmount } = render(<Chat userId="user1" receiverId="pass1" />);
    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });
});
