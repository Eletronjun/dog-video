import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CustomSelect from './CustomSelect';

describe('CustomSelect Component Tests', () => {
  const options = [
    { value: 'opt1', label: 'Opção 1' },
    { value: 'opt2', label: 'Opção 2' },
  ];

  it('renders placeholder when no value is selected', () => {
    render(<CustomSelect options={options} value="" onChange={jest.fn()} placeholder="Selecione..." />);
    expect(screen.getByText('Selecione...')).toBeInTheDocument();
  });

  it('opens options menu on click and triggers onChange', () => {
    const handleChange = jest.fn();
    render(<CustomSelect options={options} value="" onChange={handleChange} placeholder="Selecione..." />);

    const trigger = screen.getByText('Selecione...');
    fireEvent.click(trigger);

    expect(screen.getByText('Opção 1')).toBeInTheDocument();
    expect(screen.getByText('Opção 2')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Opção 1'));
    expect(handleChange).toHaveBeenCalledWith('opt1');
  });

  it('closes dropdown when clicking outside', () => {
    render(
      <div>
        <CustomSelect options={options} value="" onChange={jest.fn()} placeholder="Selecione..." />
        <button>Fora</button>
      </div>
    );

    fireEvent.click(screen.getByText('Selecione...'));
    expect(screen.getByText('Opção 1')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByText('Fora'));
    expect(screen.queryByText('Opção 1')).not.toBeInTheDocument();
  });
});
