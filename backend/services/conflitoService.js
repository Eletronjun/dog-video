const pool = require('../config/db');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

const verificarConflitoModulo = async (id_passeador, horario_passeio, id_cliente = null, id_passeador_atual = null) => {
  const query = `
    SELECT p.horario_passeio, pa.modulo, pa.modulo2, pa.nome AS nome_passeador, p.id_cliente
    FROM passeios p
    JOIN passeadores pa ON p.id_passeador = pa.id_passeador
    WHERE pa.id_passeador != $1 -- Ignora o passeador selecionado
    AND ($2::TEXT IS NULL OR p.id_cliente::TEXT != $2::TEXT) -- Ignora o cliente atual, se fornecido
    AND pa.id_passeador != $3 -- Ignora o passeador atual, se fornecido
    AND (pa.modulo = (SELECT modulo FROM passeadores WHERE id_passeador = $1)
         OR pa.modulo2 = (SELECT modulo2 FROM passeadores WHERE id_passeador = $1)) -- Verifica conflitos nos módulos do novo passeador
  `;
  const result = await pool.query(query, [
    id_passeador,
    id_cliente ? id_cliente.toString() : null,
    id_passeador_atual,
  ]);

  const horarioNovo = dayjs(horario_passeio, 'HH:mm:ss');
  for (const row of result.rows) {
    const horarioExistente = dayjs(row.horario_passeio, 'HH:mm:ss');
    const diferenca = Math.abs(horarioNovo.diff(horarioExistente, 'minute'));

    if (diferenca <= 60) { // Verifica se está dentro de 1 hora antes ou depois
      return {
        conflito: true,
        modulo: row.modulo,
        modulo2: row.modulo2,
        nomePasseador: row.nome_passeador,
      };
    }
  }

  return { conflito: false };
};

module.exports = { verificarConflitoModulo };
