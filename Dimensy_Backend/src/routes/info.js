const express = require('express');
const router = express.Router();

router.get('/guide', (req, res) => {
  res.json({
    app: 'Dimensy',
    resumo: 'O usuário preenche as ferramentas, volta para a tela inicial e gera um resultado consolidado com base no que utilizou.',
    passos: [
      'Preencha os dados nas ferramentas da Dimensy.',
      'Volte para a tela inicial quando concluir o uso das ferramentas.',
      'Clique para gerar o resultado final do projeto.',
      'Consulte a norma utilizada e o link de leitura apresentado no resultado.'
    ],
    resultado: {
      inclui_norma: true,
      inclui_link_leitura: true
    }
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Dimensy API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
