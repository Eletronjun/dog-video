const pool = require('../config/db');

exports.getLiveByModulo = async (req, res) => {
  const { modulo } = req.params;

  // Validação para garantir que o modulo é um número
  if (isNaN(modulo)) {
    return res.status(400).json({ success: false, message: 'ID do módulo inválido.' });
  }
  
  try {
    const query = 'SELECT * FROM lives WHERE modulo = $1';
    const { rows } = await pool.query(query, [modulo]);

    // Se uma live for encontrada para o módulo, retorna os dados dela
    if (rows.length > 0) {
      res.json({ success: true, live: rows[0] });
    } else {
      // Se não, informa que não há live ativa (o que é uma situação normal)
      res.status(404).json({ success: false, message: 'Nenhuma live ativa para este módulo no momento.' });
    }
  } catch (err) {
    console.error('Erro ao buscar live por módulo:', err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
  }
};
