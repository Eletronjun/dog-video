const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { verificarConflitoModulo } = require('../services/conflitoService');

exports.getAllClientes = (req, res) => {
  const query = 'SELECT * FROM clientes WHERE tipo = 0';
  pool.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).send('Erro ao consultar o banco de dados');
    }
    res.json(results.rows);
  });
};

exports.getClienteById = (req, res) => {
  const clienteId = req.params.id;

  const queryCliente = `
    SELECT nome, email, cpf, telefone, endereco, anotacoes, pacote, dias_teste, alterar_senha, termo_aceito
    FROM clientes
    WHERE id_cliente = $1
  `;

  const queryCachorros = `
    SELECT nome
    FROM cachorros
    WHERE id_cliente = $1
  `;

  const queryPasseio = `
    SELECT id_passeador, TO_CHAR(horario_passeio, 'HH24:MI') AS horario_passeio
    FROM passeios
    WHERE id_cliente = $1
    LIMIT 1
  `;

  const queryPasseador = `
    SELECT nome
    FROM passeadores
    WHERE id_passeador = $1
  `;

  pool.query(queryCliente, [clienteId], (err, clienteResults) => {
    if (err) {
      console.error('Erro ao consultar cliente:', err);
      return res.status(500).json({ success: false, message: 'Erro ao consultar cliente' });
    }

    if (clienteResults.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    }

    const cliente = clienteResults.rows[0];

    pool.query(queryCachorros, [clienteId], (err, cachorroResults) => {
      if (err) {
        console.error('Erro ao consultar cachorros:', err);
        return res.status(500).json({ success: false, message: 'Erro ao consultar cachorros' });
      }

      const caes = cachorroResults.rows.map(cachorro => cachorro.nome);

      pool.query(queryPasseio, [clienteId], (err, passeioResults) => {
        if (err) {
          console.error('Erro ao consultar passeio:', err);
          return res.status(500).json({ success: false, message: 'Erro ao consultar passeio' });
        }

        if (passeioResults.rows.length === 0) {
          return res.json({
            success: true,
            cliente: {
              ...cliente,
              caes,
              horario_passeio: null,
              passeador: null,
            },
          });
        }

        const { id_passeador, horario_passeio } = passeioResults.rows[0];

        pool.query(queryPasseador, [id_passeador], (err, passeadorResults) => {
          if (err) {
            console.error('Erro ao consultar passeador:', err);
            return res.status(500).json({ success: false, message: 'Erro ao consultar passeador' });
          }

          const passeador = passeadorResults.rows.length > 0 ? passeadorResults.rows[0].nome : null;

          res.json({
            success: true,
            cliente: {
              ...cliente,
              caes,
              horario_passeio,
              passeador,
            },
          });
        });
      });
    });
  });
};

exports.updateCliente = async (req, res) => {
  const clienteId = req.params.id;
  const { nome, email, cpf, telefone, endereco, pacote, anotacoes, caes, id_passeador, dias_teste, horario_passeio } = req.body;

  try {
    if (horario_passeio && id_passeador) {
      const horarioFormatado = `${horario_passeio}:00`;

      const passeadorAtualQuery = `
        SELECT c.id_passeador
        FROM cachorros c
        WHERE c.id_cliente = $1
        LIMIT 1
      `;
      const passeadorAtualResult = await pool.query(passeadorAtualQuery, [clienteId]);
      const id_passeador_atual = passeadorAtualResult.rows.length > 0 ? passeadorAtualResult.rows[0].id_passeador : null;

      const conflito = await verificarConflitoModulo(id_passeador, horarioFormatado, clienteId, id_passeador_atual);

      if (conflito.conflito) {
        return res.status(400).json({
          success: false,
          message: `Conflito de módulo detectado. O passeador ${conflito.nomePasseador} está usando o módulo ${conflito.modulo} e ${conflito.modulo2} em um horário próximo.`,
        });
      }
    }

    const diasTesteValue = dias_teste === '' ? null : dias_teste;

    const passeadorAtualQuery = `
      SELECT c.id_passeador
      FROM cachorros c
      WHERE c.id_cliente = $1
      LIMIT 1
    `;
    const passeadorAtualResult = await pool.query(passeadorAtualQuery, [clienteId]);
    const passeadorAtual = passeadorAtualResult.rows.length > 0 ? passeadorAtualResult.rows[0].id_passeador : null;

    const updateClienteQuery = `
      UPDATE clientes
      SET nome = $1, email = $2, cpf = $3, telefone = $4, endereco = $5, 
          pacote = $6, anotacoes = $7, dias_teste = $8
      WHERE id_cliente = $9
    `;

    await pool.query(updateClienteQuery, [
      nome, email, cpf, telefone, endereco, pacote, anotacoes, diasTesteValue, clienteId,
    ]);

    if (caes && caes.length > 0) {
      const deleteDogsQuery = 'DELETE FROM cachorros WHERE id_cliente = $1';
      await pool.query(deleteDogsQuery, [clienteId]);

      const insertDogQuery = 'INSERT INTO cachorros (nome, id_cliente, id_passeador) VALUES ($1, $2, $3)';
      for (const cao of caes) {
        await pool.query(insertDogQuery, [cao, clienteId, id_passeador || passeadorAtual]);
      }
    }

    res.json({ success: true, message: 'Cliente e cachorros atualizados com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar cliente.' });
  }
};

exports.resetSenhaCliente = async (req, res) => {
  const clienteId = req.params.id;

  if (!clienteId) {
    return res.status(400).json({ success: false, message: 'ID do cliente não fornecido' });
  }

  try {
    const novaSenha = 'dog123';
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    const updatePasswordQuery = `
      UPDATE clientes 
      SET senha = $1, alterar_senha = 1 
      WHERE id_cliente = $2`;

    pool.query(updatePasswordQuery, [senhaHash, clienteId], (err, result) => {
      if (err) {
        console.error('Erro ao redefinir senha:', err);
        return res.status(500).json({ success: false, message: 'Erro ao redefinir senha' });
      }

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
      }

      res.json({ success: true, message: 'Senha redefinida com sucesso!' });
    });
  } catch (error) {
    console.error('Erro ao processar senha:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao processar senha' });
  }
};

exports.criarCliente = async (req, res) => {
  const { nome, email, cpf, telefone, endereco, pacote, anotacao, caes, id_passeador, temporario, dias_teste, horario } = req.body;

  try {
    if (horario && id_passeador) {
      const horarioFormatado = `${horario}:00`;
      const conflito = await verificarConflitoModulo(id_passeador, horarioFormatado);

      if (conflito.conflito) {
        return res.status(400).json({
          success: false,
          message: `Conflito de módulo detectado. O passeador ${conflito.nomePasseador} está usando o módulo ${conflito.modulo} e ${conflito.modulo2} em um horário próximo.`,
        });
      }
    }

    const hashedPassword = await bcrypt.hash('dog123', 10);

    const insertClientQuery = `
      INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, anotacoes, tipo, senha, temporario, dias_teste)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10)
      RETURNING id_cliente
    `;

    const clientResult = await pool.query(insertClientQuery, [
      nome, email, cpf, telefone, endereco, pacote, anotacao, hashedPassword, temporario, dias_teste
    ]);

    if (!clientResult.rows || clientResult.rows.length === 0) {
      return res.status(500).json({ success: false, message: 'Erro ao criar cliente: ID não retornado.' });
    }

    const clienteId = clientResult.rows[0].id_cliente;

    if (caes && caes.length > 0) {
      if (!id_passeador) {
        return res.status(400).json({ success: false, message: 'ID do passeador é obrigatório quando há cães.' });
      }

      const insertDogQuery = 'INSERT INTO cachorros (nome, id_cliente, id_passeador) VALUES ($1, $2, $3)';
      for (const cao of caes) {
        await pool.query(insertDogQuery, [cao, clienteId, id_passeador]);
      }
    }

    res.json({ success: true, message: 'Cliente e cães adicionados com sucesso!', id_cliente: clienteId });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar cliente.' });
  }
};

exports.deleteCliente = (req, res) => {
  const clienteId = req.params.id;

  const deleteSubscriptionsQuery = 'DELETE FROM subscriptions WHERE id_cliente = $1';
  const deleteCachorrosQuery = 'DELETE FROM cachorros WHERE id_cliente = $1';
  const deleteClienteQuery = 'DELETE FROM clientes WHERE id_cliente = $1';

  pool.query(deleteSubscriptionsQuery, [clienteId], (err) => {
    if (err) {
      console.error('Erro ao deletar subscriptions:', err);
      return res.status(500).send('Erro ao deletar subscriptions');
    }

    pool.query(deleteCachorrosQuery, [clienteId], (err) => {
      if (err) {
        console.error('Erro ao deletar cachorros:', err);
        return res.status(500).send('Erro ao deletar cachorros');
      }

      pool.query(deleteClienteQuery, [clienteId], (err) => {
        if (err) {
          console.error('Erro ao deletar cliente:', err);
          return res.status(500).send('Erro ao deletar cliente');
        }

        res.json({ success: true, message: 'Cliente e seus dados associados deletados com sucesso!' });
      });
    });
  });
};
