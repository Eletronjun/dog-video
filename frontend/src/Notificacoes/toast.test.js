import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Toast from './toast';

describe('Toast Component', () => {
  test('Renderiza a mensagem do toast', () => {
    render(<Toast message="Notificação de teste" onClose={() => {}} />);
    
    expect(screen.getByText('Notificação de teste')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fechar/i })).toBeInTheDocument();
  });

  test('Chama onClose ao clicar no botão fechar', () => {
    const handleClose = jest.fn();
    render(<Toast message="Notificação de teste" onClose={handleClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
