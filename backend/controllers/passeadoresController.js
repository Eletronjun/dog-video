const pool = require('../config/db');
const { verificarConflitoModuloPasseador } = require('../services/conflitoService');

exports.getPasseadores = (req, res) => {
  const passeadorId = req.params.id; // ID opcional

  if (passeadorId) {
    const queryPasseador = `
      SELECT nome, email, imagem, cpf, telefone, endereco, modulo, modulo2 
      FROM passeadores 
      WHERE id_passeador = $1`;

    const queryClientes = `
      SELECT DISTINCT clientes.nome 
      FROM clientes
      JOIN cachorros ON cachorros.id_cliente = clientes.id_cliente
      WHERE cachorros.id_passeador = $1`;

    pool.query(queryPasseador, [passeadorId], (err, passeadorResults) => {
      if (err) {
        console.error('Erro ao consultar passeador:', err);
        return res.status(500).send('Erro ao consultar passeador');
      }

      if (passeadorResults.rows.length === 0) {
        return res.status(404).send('Passeador não encontrado');
      }

      const passeador = passeadorResults.rows[0];
      if (passeador.imagem) {
        passeador.imagem = `data:image/jpeg;base64,${passeador.imagem.toString('base64')}`;
      }

      pool.query(queryClientes, [passeadorId], (err, clienteResults) => {
        if (err) {
          console.error('Erro ao consultar clientes:', err);
          return res.status(500).send('Erro ao consultar clientes');
        }

        const clientes = clienteResults.rows.map(cliente => cliente.nome).join(', ');
        res.json({ success: true, passeador, clientes });
      });
    });
  } else {
    const queryTodosPasseadores = `
      SELECT id_passeador, nome, imagem
      FROM passeadores`;

    pool.query(queryTodosPasseadores, (err, results) => {
      if (err) {
        console.error('Erro ao consultar passeadores:', err);
        return res.status(500).json({ success: false, message: 'Erro ao consultar passeadores' });
      }

      const passeadores = results.rows.map(passeador => ({
        id: passeador.id_passeador,
        nome: passeador.nome,
        imagem: passeador.imagem ? `data:image/jpeg;base64,${passeador.imagem.toString('base64')}` : null
      }));

      res.json({ success: true, passeadores });
    });
  }
};

exports.atualizarPasseador = async (req, res) => {
  const passeadorId = req.params.id;
  const { nome, email, cpf, telefone, endereco, imagem, modulo, modulo2 } = req.body;

  try {
    const conflito = await verificarConflitoModuloPasseador(modulo, modulo2, passeadorId);

    if (conflito.conflito) {
      return res.status(400).json({
        success: false,
        message: `Conflito de módulo detectado. O passeador ${conflito.nomePasseador} está usando o módulo ${conflito.modulo} e ${conflito.modulo2} em um horário próximo.`,
      });
    }

    const imagemBlob = imagem ? Buffer.from(imagem.replace(/^data:image\/\w+;base64,/, ""), 'base64') : null;

    const query = `
      UPDATE passeadores
      SET nome = $1, email = $2, cpf = $3, telefone = $4, endereco = $5, imagem = $6, modulo = $7, modulo2 = $8
      WHERE id_passeador = $9
    `;

    await pool.query(query, [nome, email, cpf, telefone, endereco, imagemBlob, modulo, modulo2, passeadorId]);
    res.json({ success: true, message: 'Passeador atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar passeador:', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar passeador' });
  }
};

exports.criarPasseador = (req, res) => {
  const { nome, email, cpf, telefone, endereco, imagem, modulo, modulo2 } = req.body;

  const imagemBlob = imagem ? Buffer.from(imagem.replace(/^data:image\/\w+;base64,/, ""), 'base64') : null;

  const query = `
    INSERT INTO passeadores (nome, email, cpf, telefone, endereco, imagem, modulo, modulo2)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id_passeador
  `;

  pool.query(query, [nome, email, cpf, telefone, endereco, imagemBlob, modulo, modulo2], (err, result) => {
    if (err) {
      console.error('Erro ao criar passeador:', err);
      return res.status(500).json({ success: false, message: 'Erro ao criar passeador' });
    }
    const novoPasseadorId = result.rows[0].id_passeador;
    res.json({ success: true, message: 'Passeador criado com sucesso!', id_passeador: novoPasseadorId });
  });
};

exports.excluirPasseador = (req, res) => {
  const passeadorId = req.params.id;

  const updateCachorrosQuery = 'UPDATE cachorros SET id_passeador = NULL WHERE id_passeador = $1';
  pool.query(updateCachorrosQuery, [passeadorId], (err) => {
    if (err) {
      console.error('Erro ao atualizar cachorros associados ao passeador:', err);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar cachorros associados ao passeador' });
    }

    const deleteQuery = 'DELETE FROM passeadores WHERE id_passeador = $1';
    pool.query(deleteQuery, [passeadorId], (err, result) => {
      if (err) {
        console.error('Erro ao excluir passeador:', err);
        return res.status(500).json({ success: false, message: 'Erro ao excluir passeador' });
      }

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Passeador não encontrado' });
      }

      res.json({ success: true, message: 'Passeador excluído com sucesso!' });
    });
  });
};

exports.getPasseadorPorCliente = async (req, res) => {
  const { id_cliente } = req.params;

  try {
    const query = `
      SELECT id_passeador
      FROM passeios
      WHERE id_cliente = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [id_cliente]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Passeador não encontrado para o cliente.' });
    }

    res.json({ success: true, id_passeador: result.rows[0].id_passeador });
  } catch (error) {
    console.error('Erro ao buscar passeador:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar passeador.' });
  }
};

exports.getHorariosPasseador = async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT TO_CHAR(horario_passeio, 'HH24:MI') AS horario_passeio
      FROM passeios
      WHERE id_passeador = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.json({ success: true, horarios: [] });
    }

    const horarios = result.rows.map(row => row.horario_passeio);
    res.json({ success: true, horarios });
  } catch (error) {
    console.error('Erro ao buscar horários de passeio:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar horários de passeio.' });
  }
};
