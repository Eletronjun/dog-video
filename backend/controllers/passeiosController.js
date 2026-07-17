const pool = require('../config/db');

exports.criarPasseio = async (req, res) => {
  const { horario_passeio, id_cliente, id_passeador } = req.body;

  try {
    const query = `
      INSERT INTO passeios (horario_passeio, id_cliente, id_passeador)
      VALUES ($1, $2, $3)
    `;
    await pool.query(query, [horario_passeio, id_cliente, id_passeador || null]);

    res.status(201).json({ success: true, message: 'Passeio criado com sucesso!' });
  } catch (error) {
    console.error('Erro ao criar passeio:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar passeio.' });
  }
};

exports.updatePasseio = async (req, res) => {
  const { id_cliente } = req.params;
  let { horario_passeio, id_passeador } = req.body;

  // Garante que id_passeador seja null se for uma string vazia
  id_passeador = id_passeador === "" ? null : id_passeador;

  try {
    const query = `
      UPDATE passeios
      SET horario_passeio = $1, id_passeador = $2
      WHERE id_cliente = $3
    `;
    const result = await pool.query(query, [horario_passeio, id_passeador, id_cliente]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Passeio não encontrado para o cliente.' });
    }

    res.json({ success: true, message: 'Passeio atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar passeio:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar passeio.' });
  }
};
