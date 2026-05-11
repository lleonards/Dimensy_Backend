const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  DICIONARIO,
  LUMINARIAS,
  calcularTomadas,
  calcularMateriais,
  calcularPadraoEntrada,
  calcularCondutores,
  consumirCreditoSeNecessario,
  gerarRelatorioConsolidado
} = require('../services/calculoHelpers');

function handleError(res, err, defaultMessage) {
  return res.status(err.status || 500).json({
    error: err.message || defaultMessage,
    semCreditos: Boolean(err.semCreditos)
  });
}

router.post('/materiais', authMiddleware, async (req, res) => {
  try {
    return res.json(calcularMateriais(req.body || {}));
  } catch (err) {
    return handleError(res, err, 'Erro no cálculo de materiais.');
  }
});

router.post('/tomadas', authMiddleware, async (req, res) => {
  try {
    return res.json(calcularTomadas(req.body || {}));
  } catch (err) {
    return handleError(res, err, 'Erro no dimensionamento de tomadas.');
  }
});

router.post('/padrao-entrada', authMiddleware, async (req, res) => {
  try {
    const payload = req.body?.ambientes_config || req.body || {};
    return res.json(calcularPadraoEntrada(payload));
  } catch (err) {
    return handleError(res, err, 'Erro no cálculo do padrão de entrada.');
  }
});

router.post('/condutores', authMiddleware, async (req, res) => {
  try {
    return res.json(calcularCondutores(req.body || {}));
  } catch (err) {
    return handleError(res, err, 'Erro no dimensionamento de condutores.');
  }
});

router.post('/gerar-relatorio', authMiddleware, async (req, res) => {
  try {
    const ferramentas = req.body?.ferramentas || {};
    const nomeProjeto = String(req.body?.nome_projeto || 'Projeto sem nome').trim() || 'Projeto sem nome';
    const relatorio = gerarRelatorioConsolidado(ferramentas, nomeProjeto);
    const credito = await consumirCreditoSeNecessario(req.user.id, `geracao-relatorio:${nomeProjeto}`);

    return res.json({
      ...relatorio,
      creditos: credito,
      mensagem: 'Relatório consolidado gerado com sucesso. O crédito foi consumido somente nesta etapa.'
    });
  } catch (err) {
    return handleError(res, err, 'Erro ao gerar relatório consolidado.');
  }
});

router.get('/dicionario', authMiddleware, async (req, res) => {
  const { termo } = req.query;

  if (termo) {
    const filtrado = DICIONARIO.filter(item =>
      item.termo.toLowerCase().includes(String(termo).toLowerCase()) ||
      item.definicao.toLowerCase().includes(String(termo).toLowerCase())
    );
    return res.json({ resultados: filtrado, total: filtrado.length });
  }

  return res.json({ resultados: DICIONARIO, total: DICIONARIO.length });
});

router.get('/luminarias', authMiddleware, async (req, res) => {
  return res.json({ luminarias: LUMINARIAS, total: LUMINARIAS.length });
});

module.exports = router;
