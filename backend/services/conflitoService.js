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
    AND ($3::INT IS NULL OR pa.id_passeador != $3) -- Ignora o passeador atual, se fornecido
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

const verificarConflitoModuloPasseador = async (modulo, modulo2, id_passeador) => {
  const query = `
    SELECT p.horario_passeio, pa.nome AS nome_passeador, pa.modulo, pa.modulo2
    FROM passeios p
    JOIN passeadores pa ON p.id_passeador = pa.id_passeador
    WHERE pa.id_passeador != $1 -- Ignora o passeador atual
    AND ($2 = pa.modulo OR $2 = pa.modulo2 OR $3 = pa.modulo OR $3 = pa.modulo2) -- Verifica conflitos nos módulos
  `;
  const result = await pool.query(query, [id_passeador, modulo, modulo2]);

  const horarios = result.rows.map(row => ({
    horario: dayjs(row.horario_passeio, 'HH:mm:ss'),
    nomePasseador: row.nome_passeador,
    modulo: row.modulo,
    modulo2: row.modulo2,
  }));

  // Busca o horário do passeador que está sendo editado
  const horarioPasseadorEditadoQuery = `
    SELECT p.horario_passeio
    FROM passeios p
    WHERE p.id_passeador = $1
    LIMIT 1
  `;
  const horarioPasseadorEditadoResult = await pool.query(horarioPasseadorEditadoQuery, [id_passeador]);

  if (horarioPasseadorEditadoResult.rows.length === 0) {
    return { conflito: false }; // Se o passeador não tem horário, não há conflito
  }

  const horarioPasseadorEditado = dayjs(horarioPasseadorEditadoResult.rows[0].horario_passeio, 'HH:mm:ss');

  for (const { horario, nomePasseador, modulo, modulo2 } of horarios) {
    const diferenca = Math.abs(horarioPasseadorEditado.diff(horario, 'minute')); // Calcula a diferença entre os horários

    if (diferenca <= 60) { // Verifica se está dentro de 1 hora antes ou depois
      return {
        conflito: true,
        nomePasseador,
        modulo,
        modulo2,
      };
    }
  }

  return { conflito: false };
};

module.exports = { verificarConflitoModulo, verificarConflitoModuloPasseador };
