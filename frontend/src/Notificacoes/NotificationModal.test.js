import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationModal from './NotificationModal';
import Modal from 'react-modal';

// O react-modal requer que o appElement seja definido para acessibilidade,
// vamos usar uma div mock ou ignorar configurando react-modal
Modal.setAppElement(document.createElement('div'));

describe('NotificationModal Component', () => {
  test('Renderiza o modal quando isOpen é true', () => {
    render(<NotificationModal isOpen={true} onClose={() => {}} />);
    
    expect(screen.getByText('Permitir Notificações')).toBeInTheDocument();
    expect(screen.getByText('Permita notificações para receber atualizações importantes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fechar/i })).toBeInTheDocument();
  });

  test('Não renderiza o conteúdo quando isOpen é false', () => {
    render(<NotificationModal isOpen={false} onClose={() => {}} />);
    
    expect(screen.queryByText('Permitir Notificações')).not.toBeInTheDocument();
  });

  test('Chama onClose ao clicar em fechar', () => {
    const handleClose = jest.fn();
    render(<NotificationModal isOpen={true} onClose={handleClose} />);
    
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
    
    expect(handleClose).toHaveBeenCalled();
  });
});
