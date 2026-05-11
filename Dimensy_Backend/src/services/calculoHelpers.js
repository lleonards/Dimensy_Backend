const supabase = require('./supabase');

const NORMA_COMPLETA_URL = 'https://www.saude.df.gov.br/documents/37101/62415/ABNT+NBR+5410.2004+Vers%C3%A3o+Corrigida+%E2%80%93+2008+de+30+de+setembro+de+2004_instala%C3%A7%C3%B5es+el%C3%A9tricas+de+baixa+tens%C3%A3o..pdf';

const NORMA_REFERENCIAS = {
  tomadas: {
    codigo: 'ABNT NBR 5410:2004',
    item: '9.5.2.2',
    titulo: 'Abrir texto completo da NBR 5410',
    url: NORMA_COMPLETA_URL,
    fonte: 'Consulta externa da norma'
  },
  materiais: {
    codigo: 'ABNT NBR 5410:2004',
    item: '9.5.2.1.1, 9.5.2.1.2 e 9.5.2.2',
    titulo: 'Abrir texto completo da NBR 5410',
    url: NORMA_COMPLETA_URL,
    fonte: 'Consulta externa da norma'
  },
  padraoEntrada: {
    codigo: 'ABNT NBR 5410:2004 + padrão da concessionária local',
    item: 'Validação complementar da concessionária',
    titulo: 'Abrir texto completo da NBR 5410',
    url: NORMA_COMPLETA_URL,
    fonte: 'Consulta externa da norma'
  },
  condutores: {
    codigo: 'ABNT NBR 5410:2004',
    item: '6.2.7 e Tabela 47',
    titulo: 'Abrir texto completo da NBR 5410',
    url: NORMA_COMPLETA_URL,
    fonte: 'Consulta externa da norma'
  }
};

const TOOL_LABELS = {
  materiais: 'Calculadora de Materiais',
  tomadas: 'Dimensionamento de Tomadas',
  padraoEntrada: 'Padrão de Entrada',
  condutores: 'Dimensionamento de Condutores'
};

const DICIONARIO = [
  { termo: 'Amperagem (A)', definicao: 'Unidade de medida da intensidade de corrente elétrica. 1A = fluxo de 1 coulomb por segundo.' },
  { termo: 'Bitola do fio', definicao: 'Secção transversal do condutor elétrico, medida em mm². Determina a capacidade de condução de corrente.' },
  { termo: 'Chave DR', definicao: 'Dispositivo Residual (diferencial-residual). Protege pessoas contra choques elétricos detectando correntes de fuga.' },
  { termo: 'Chave DPS', definicao: 'Dispositivo de Proteção contra Surtos. Protege equipamentos contra variações de tensão (raios, descargas).' },
  { termo: 'Circuito terminal', definicao: 'Circuito que alimenta diretamente os pontos de utilização (tomadas, luminárias). Não alimenta outros circuitos.' },
  { termo: 'Conduíte / Eletroduto', definicao: 'Tubo rígido ou flexível utilizado para proteger e organizar os fios e cabos elétricos.' },
  { termo: 'Corrente de curto-circuito', definicao: 'Alta corrente que flui quando dois condutores se tocam diretamente. Causa superaquecimento e incêndio.' },
  { termo: 'Disjuntor', definicao: 'Dispositivo de proteção que interrompe o circuito automaticamente em caso de sobrecarga ou curto-circuito.' },
  { termo: 'Eletroduto', definicao: 'Ver Conduíte. Tubo para proteção mecânica de condutores elétricos.' },
  { termo: 'Fator de demanda', definicao: 'Relação entre a demanda máxima e a potência total instalada. Indica o uso simultâneo dos equipamentos.' },
  { termo: 'Fio terra', definicao: 'Condutor de proteção que conecta partes metálicas dos equipamentos ao solo, prevenindo choques.' },
  { termo: 'Fase', definicao: 'Condutor ativo que transporta a corrente elétrica. Identificado pelas cores preta, vermelha ou marrom (NBR 5410).' },
  { termo: 'GFCI / IDR', definicao: 'Interruptor Diferencial Residual. Detecta desequilíbrio de corrente e desliga o circuito em milissegundos.' },
  { termo: 'Neutro', definicao: 'Condutor de retorno da corrente. Identificado pela cor azul claro na NBR 5410.' },
  { termo: 'NBR 5410', definicao: 'Norma Brasileira que regulamenta instalações elétricas de baixa tensão em edificações. Principal norma do eletricista.' },
  { termo: 'PCMSO', definicao: 'Programa de Controle Médico de Saúde Ocupacional. Obrigatório para empresas com eletricistas (NR-7).' },
  { termo: 'Potência (W)', definicao: 'Unidade de medida do consumo ou geração de energia elétrica. P = V × I.' },
  { termo: 'Quadro de distribuição', definicao: 'Painel elétrico onde ficam os disjuntores dos circuitos da residência. Centro de distribuição da instalação.' },
  { termo: 'Queda de tensão', definicao: 'Perda de tensão ao longo do condutor. A NBR 5410 limita a queda de tensão em valores máximos no projeto, exigindo conferência do trecho terminal e do conjunto da instalação.' },
  { termo: 'TUG', definicao: 'Tomada de Uso Geral. Ponto destinado ao uso geral, com quantidade mínima definida pela NBR 5410 conforme o ambiente.' },
  { termo: 'TUE', definicao: 'Tomada de Uso Específico. Ponto destinado a equipamento específico previsto no projeto, dimensionado conforme a potência nominal do equipamento.' },
  { termo: 'Tensão (V)', definicao: 'Diferença de potencial elétrico entre dois pontos. No Brasil: 127V ou 220V monofásico.' },
  { termo: 'Aterramento', definicao: 'Sistema de conexão elétrica ao solo. Essencial para proteção contra choques e surtos (NBR 5410).' },
  { termo: 'SPDA', definicao: 'Sistema de Proteção contra Descargas Atmosféricas (para-raios). Regulado pela NBR 5419.' },
  { termo: 'Caixa 2x4', definicao: 'Caixa elétrica de alvenaria para tomadas e interruptores simples. Dimensões: 2 x 4 polegadas.' },
  { termo: 'Caixa 4x4', definicao: 'Caixa elétrica maior, usada para luminárias e tomadas duplas. Dimensões: 4 x 4 polegadas.' }
];

const LUMINARIAS = [
  { tipo: 'LED Bulbo', potencia: '4W a 15W', uso: 'Uso geral em quartos, corredores e escritórios', vida_util: '15.000 a 25.000 horas', eficiencia: 'Alta (100-130 lm/W)', custo: 'Baixo', dica: 'Substituta direta da lâmpada incandescente. Ideal para a maioria dos ambientes.' },
  { tipo: 'LED Tubular (T8)', potencia: '10W a 20W', uso: 'Garagens, comércio, lavanderias, áreas de serviço', vida_util: '30.000 horas', eficiencia: 'Muito alta (120-150 lm/W)', custo: 'Médio', dica: 'Excelente para iluminação uniforme em grandes áreas.' },
  { tipo: 'Spot LED', potencia: '3W a 7W', uso: 'Iluminação de destaque, salas, cozinhas modernas', vida_util: '20.000 horas', eficiencia: 'Alta', custo: 'Médio', dica: 'Embutido em forro, cria efeito de luz direcionada e elegante.' },
  { tipo: 'Plafon LED', potencia: '12W a 36W', uso: 'Quartos, salas, corredores, banheiros', vida_util: '25.000 horas', eficiencia: 'Alta', custo: 'Médio', dica: 'Fixado no teto, distribui luz uniformemente pelo ambiente.' },
  { tipo: 'Luminária de Embutir', potencia: '18W a 40W', uso: 'Escritórios, salas comerciais, cozinhas', vida_util: '30.000 horas', eficiencia: 'Muito alta', custo: 'Alto', dica: 'Instalada no forro rebaixado. Muito usada em ambientes modernos.' },
  { tipo: 'Arandela', potencia: '5W a 15W', uso: 'Varandas, corredores, quartos, banheiros', vida_util: '20.000 horas', eficiencia: 'Média-alta', custo: 'Médio', dica: 'Instalada na parede. Complementa a iluminação principal com charme.' },
  { tipo: 'Luminária Pendente', potencia: '10W a 30W', uso: 'Mesas de jantar, ilhas de cozinha, espaços decorativos', vida_util: '20.000 horas', eficiencia: 'Média', custo: 'Variável', dica: 'Cria pontos focais. A altura ideal é 70-80cm acima da mesa de jantar.' },
  { tipo: 'Luminária Fluorescente', potencia: '20W a 65W', uso: 'Garagens, depósitos, áreas de serviço (uso legado)', vida_util: '8.000 a 12.000 horas', eficiencia: 'Média (60-90 lm/W)', custo: 'Baixo', dica: 'Em fase de substituição pelo LED. Menor eficiência e contém mercúrio.' },
  { tipo: 'LED Strip (Fita)', potencia: '4W a 20W/metro', uso: 'Rodapés, bancadas, sancas, iluminação indireta', vida_util: '25.000 horas', eficiencia: 'Alta', custo: 'Médio', dica: 'Cria efeitos de luz indireta. Disponível em RGB para ambientes modernos.' },
  { tipo: 'Tartaruga / Luminária Externa', potencia: '7W a 15W', uso: 'Áreas externas, jardins, garagens cobertas', vida_util: '20.000 horas', eficiencia: 'Alta', custo: 'Médio', dica: 'Deve ter grau de proteção IP65 ou superior para uso externo.' }
];

function round(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

function ensurePositiveNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Campo inválido: ${fieldName}.`);
  }
  return parsed;
}

function calcularPerimetro(comprimento, largura) {
  return 2 * (comprimento + largura);
}

function calcularCargaIluminacao(area) {
  if (area <= 6) return 100;
  return 100 + Math.ceil((area - 6) / 4) * 60;
}

function getSugestoesTUE(tipo) {
  const mensagens = {
    quarto: ['Ar-condicionado, se houver equipamento previsto no ambiente.'],
    sala: ['Ar-condicionado, TV/Home Theater ou outro equipamento dedicado, se previsto no projeto.'],
    cozinha: ['Geladeira, micro-ondas, forno elétrico/cooktop e lava-louças, se previstos no projeto.'],
    banheiro: ['Chuveiro, torneira elétrica ou outro equipamento dedicado, se previstos no projeto.'],
    lavanderia: ['Máquina de lavar, secadora ou ferro em ponto dedicado, se previstos no projeto.'],
    garagem: ['Portão automático, carregador veicular ou bancada técnica, se previstos no projeto.'],
    escritorio: ['Ar-condicionado, impressora dedicada ou nobreak de maior porte, se previstos no projeto.'],
    corredor: ['Sem TUE típica obrigatória; prever apenas se houver equipamento específico.']
  };

  return mensagens[tipo] || ['A TUE só deve existir quando houver equipamento específico previsto para o ambiente.'];
}

function calcularTomadas(data) {
  const tipo = (data.tipo || '').toLowerCase().trim();
  const comprimento = ensurePositiveNumber(data.comprimento, 'comprimento');
  const largura = ensurePositiveNumber(data.largura, 'largura');
  const area = comprimento * largura;
  const perimetro = calcularPerimetro(comprimento, largura);

  let tugMinimo = 1;
  let criterio = 'Critério mínimo para ambientes residenciais em geral.';
  let potenciaPorPonto = '100 VA por ponto de TUG';
  let posicao = 'Distribuição conforme layout do ambiente.';

  if (['cozinha', 'lavanderia'].includes(tipo)) {
    tugMinimo = Math.max(1, Math.ceil(perimetro / 3.5));
    criterio = 'Mínimo de 1 TUG a cada 3,5 m de perímetro, ou fração, com pelo menos um ponto acima da bancada/pia quando aplicável.';
    potenciaPorPonto = tugMinimo <= 3
      ? '600 VA por ponto de TUG'
      : '600 VA por ponto nos 3 primeiros TUG e 100 VA por ponto nos demais';
    posicao = 'Distribuir nos trechos de uso e prever pelo menos um ponto acima da bancada/pia.';
  } else if (tipo === 'banheiro') {
    tugMinimo = 1;
    criterio = 'Mínimo de 1 TUG junto ao lavatório, fora das zonas de risco do box.';
    potenciaPorPonto = '600 VA para o ponto de TUG junto ao lavatório';
    posicao = 'Próximo ao lavatório e afastado da área do box.';
  } else if (tipo === 'corredor') {
    tugMinimo = Math.max(comprimento, largura) > 3 ? 1 : 0;
    criterio = tugMinimo
      ? 'Corredores com mais de 3 m devem ter pelo menos 1 TUG.'
      : 'Corredores com até 3 m não exigem TUG mínima pela regra aplicada.';
    potenciaPorPonto = tugMinimo ? '100 VA por ponto de TUG' : 'Sem TUG mínima obrigatória';
    posicao = 'Distribuir conforme conveniência de uso.';
  } else {
    tugMinimo = area <= 6 ? 1 : Math.ceil(perimetro / 5);
    criterio = area <= 6
      ? 'Ambientes com área até 6 m² exigem pelo menos 1 TUG.'
      : 'Ambientes com área acima de 6 m² exigem pelo menos 1 TUG a cada 5 m de perímetro, ou fração.';
    posicao = 'Distribuir uniformemente no perímetro útil do ambiente.';
  }

  const cargaTugVa = ['cozinha', 'lavanderia', 'banheiro'].includes(tipo)
    ? tugMinimo <= 3
      ? tugMinimo * 600
      : 1800 + (tugMinimo - 3) * 100
    : tugMinimo * 100;

  return {
    ambiente: tipo || 'ambiente',
    area: round(area),
    perimetro: round(perimetro),
    tug_quantidade: tugMinimo,
    tug_quantidade_minima: tugMinimo,
    tug_potencia: potenciaPorPonto,
    tug_carga_total_va: cargaTugVa,
    tug_posicao: posicao,
    tug_formula: criterio,
    tue: [],
    tue_opcionais: getSugestoesTUE(tipo),
    tue_observacao: 'TUE é opcional e somente deve ser prevista se houver equipamento de uso específico no ambiente. O ponto deve ser dimensionado conforme a potência nominal do equipamento.',
    norma: {
      ...NORMA_REFERENCIAS.tomadas,
      observacao: 'A NBR 5410 define quantidades mínimas de TUG. TUE não possui número fixo por cômodo: ela depende do equipamento específico previsto no projeto.'
    }
  };
}

function calcularMateriais(data) {
  if (!data.ambientes || !Array.isArray(data.ambientes) || data.ambientes.length === 0) {
    throw new Error('Informe os ambientes.');
  }

  const ambientes = [];
  const totais = {
    tomadas_tug_minimas: 0,
    tomadas_tue_obrigatorias: 0,
    pontos_luz_minimos: 0,
    carga_iluminacao_va: 0,
    carga_tug_va: 0,
    metros_fio_15_estimados: 0,
    metros_fio_25_estimados: 0,
    eletrodutos_estimados: 0,
    caixas_2x4_estimadas: 0,
    caixas_4x4_estimadas: 0
  };

  for (const ambiente of data.ambientes) {
    const comprimento = ensurePositiveNumber(ambiente.comprimento, 'comprimento');
    const largura = ensurePositiveNumber(ambiente.largura, 'largura');
    const altura = ambiente.altura ? ensurePositiveNumber(ambiente.altura, 'altura') : 2.8;
    const area = comprimento * largura;
    const tomadas = calcularTomadas({ tipo: ambiente.tipo, comprimento, largura });
    const pontosLuz = 1;
    const cargaIluminacaoVa = calcularCargaIluminacao(area);

    const fio15 = Math.ceil((pontosLuz * (altura + 2)) * 1.3);
    const fio25 = Math.ceil((tomadas.tug_quantidade * (altura + 3)) * 1.3);
    const eletroduto = Math.ceil(((fio15 + fio25) / 3) * 1.15);
    const caixas24 = tomadas.tug_quantidade;
    const caixas44 = pontosLuz;

    totais.tomadas_tug_minimas += tomadas.tug_quantidade;
    totais.pontos_luz_minimos += pontosLuz;
    totais.carga_iluminacao_va += cargaIluminacaoVa;
    totais.carga_tug_va += tomadas.tug_carga_total_va;
    totais.metros_fio_15_estimados += fio15;
    totais.metros_fio_25_estimados += fio25;
    totais.eletrodutos_estimados += eletroduto;
    totais.caixas_2x4_estimadas += caixas24;
    totais.caixas_4x4_estimadas += caixas44;

    ambientes.push({
      ambiente: ambiente.tipo,
      dimensoes: `${comprimento}m x ${largura}m`,
      area: round(area),
      tomadas_tug_minimas: tomadas.tug_quantidade,
      tomadas_tue_obrigatorias: 0,
      pontos_luz_minimos: pontosLuz,
      carga_iluminacao_va: cargaIluminacaoVa,
      carga_tug_va: tomadas.tug_carga_total_va,
      metros_fio_15_estimados: fio15,
      metros_fio_25_estimados: fio25,
      eletrodutos_estimados: eletroduto,
      caixas_2x4_estimadas: caixas24,
      caixas_4x4_estimadas: caixas44,
      tue_opcionais: tomadas.tue_opcionais,
      observacao_normativa: tomadas.tug_formula
    });
  }

  return {
    ambientes,
    totais,
    observacao_geral: 'As quantidades mínimas de TUG e pontos de iluminação seguem a NBR 5410. As metragens de cabos, eletrodutos e caixas são estimativas operacionais com base nas dimensões informadas e não substituem o projeto executivo.',
    norma: {
      ...NORMA_REFERENCIAS.materiais,
      observacao: 'TUE não foi contabilizada como obrigatória porque depende dos equipamentos efetivamente previstos pelo usuário.'
    }
  };
}

function calcularPadraoEntrada(data) {
  const areaTotal = ensurePositiveNumber(data.area_total, 'área total');
  const qtdQuartos = Math.max(1, Number(data.qtd_quartos || 1));
  const potenciaPersonalizada = Number(data.potencia_personalizada || 0);

  let potenciaTotal = calcularCargaIluminacao(areaTotal) + (qtdQuartos * 1000);

  if (data.tem_chuveiro) potenciaTotal += 7500;
  if (data.tem_arcondicionado) potenciaTotal += 3000;
  if (data.tem_torneira_eletrica) potenciaTotal += 4000;
  if (data.tem_forno) potenciaTotal += 6000;
  if (data.tem_secadora) potenciaTotal += 2500;
  potenciaTotal += potenciaPersonalizada;

  const potenciaProjeto = potenciaTotal * 1.3;
  const correnteMonofasico = potenciaProjeto / 127;
  const correnteBifasico = potenciaProjeto / 220;
  const correnteTrifasico = potenciaProjeto / (Math.sqrt(3) * 220);

  let padrao;
  let tensao;
  let disjuntor;
  let medidor;
  let descricao;

  if (potenciaProjeto <= 6000) {
    padrao = 'Monofásico';
    tensao = '127 V ou 220 V';
    disjuntor = correnteMonofasico <= 20 ? '20 A' : correnteMonofasico <= 25 ? '25 A' : correnteMonofasico <= 32 ? '32 A' : '40 A';
    medidor = '5(60) A';
    descricao = 'Estimativa para residência de pequeno porte.';
  } else if (potenciaProjeto <= 10000) {
    padrao = 'Bifásico';
    tensao = '220 V';
    disjuntor = correnteBifasico <= 30 ? '30 A' : correnteBifasico <= 40 ? '40 A' : '50 A';
    medidor = '5(60) A';
    descricao = 'Estimativa para residência de médio porte.';
  } else {
    padrao = 'Trifásico';
    tensao = '127/220 V';
    disjuntor = correnteTrifasico <= 32 ? '32 A' : correnteTrifasico <= 50 ? '50 A' : correnteTrifasico <= 63 ? '63 A' : '80 A';
    medidor = '10(100) A';
    descricao = 'Estimativa para residência de maior demanda.';
  }

  return {
    potencia_instalada: Math.round(potenciaTotal),
    potencia_projeto: Math.round(potenciaProjeto),
    padrao,
    tensao,
    disjuntor_geral: disjuntor,
    medidor,
    descricao,
    norma: {
      ...NORMA_REFERENCIAS.padraoEntrada,
      observacao: 'O padrão de entrada precisa ser validado com as regras da concessionária local antes da execução.'
    }
  };
}

function calcularCondutores(data) {
  const corrente = ensurePositiveNumber(data.corrente, 'corrente');
  const comprimento = ensurePositiveNumber(data.comprimento, 'comprimento');
  const tensao = ensurePositiveNumber(data.tensao || 127, 'tensão');
  const tipoCircuito = (data.tipo_circuito || 'terminal').toLowerCase();

  const tabela = [
    { secao: 1.5, capacidade: 15.5 },
    { secao: 2.5, capacidade: 21 },
    { secao: 4, capacidade: 28 },
    { secao: 6, capacidade: 36 },
    { secao: 10, capacidade: 50 },
    { secao: 16, capacidade: 68 },
    { secao: 25, capacidade: 89 },
    { secao: 35, capacidade: 110 }
  ];

  const quedaMaximaPercentual = tipoCircuito === 'terminal' ? 3 : 5;
  const quedaTensaoMaxima = tensao * (quedaMaximaPercentual / 100);
  const resistividade = 0.0172;
  const secaoPorQueda = (2 * corrente * comprimento * resistividade) / quedaTensaoMaxima;

  const secaoPorCapacidade = tabela.find(item => item.capacidade >= corrente) || tabela[tabela.length - 1];
  const secaoFinal = Math.max(secaoPorQueda, secaoPorCapacidade.secao);
  const secaoNormalizada = tabela.find(item => item.secao >= secaoFinal) || tabela[tabela.length - 1];

  const quedaReal = (2 * corrente * comprimento * resistividade) / secaoNormalizada.secao;
  const quedaPercentual = (quedaReal / tensao) * 100;

  return {
    corrente_projeto: round(corrente),
    comprimento: round(comprimento),
    tensao: round(tensao),
    secao_recomendada: `${secaoNormalizada.secao} mm²`,
    capacidade_conducao: `${secaoNormalizada.capacidade} A`,
    queda_tensao: `${round(quedaReal)} V`,
    queda_percentual: `${round(quedaPercentual)}%`,
    aprovado: quedaPercentual <= quedaMaximaPercentual,
    norma: {
      ...NORMA_REFERENCIAS.condutores,
      observacao: 'Valide também as seções mínimas normativas por tipo de circuito e método de instalação antes da execução.'
    },
    recomendacao: `Utilize condutor de cobre com seção mínima de ${secaoNormalizada.secao} mm², observando o método de instalação e o tipo do circuito.`
  };
}

function ensureArrayEntries(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function buildRegistro(toolKey, entry, index) {
  const safeEntry = entry?.data ? entry.data : entry;
  const registroId = entry?.id || `${toolKey}-${index + 1}`;
  const label = entry?.label || entry?.nome || `${TOOL_LABELS[toolKey] || toolKey} ${index + 1}`;

  let resultado;
  if (toolKey === 'materiais') resultado = calcularMateriais(safeEntry);
  if (toolKey === 'tomadas') resultado = calcularTomadas(safeEntry);
  if (toolKey === 'padraoEntrada') resultado = calcularPadraoEntrada(safeEntry);
  if (toolKey === 'condutores') resultado = calcularCondutores(safeEntry);

  return {
    registro_id: registroId,
    registro_nome: label,
    salvo_em: entry?.savedAt || null,
    entrada: safeEntry,
    resultado
  };
}

async function consumirCreditoSeNecessario(userId, ferramenta = 'geracao-consolidada') {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('creditos, plano')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    const err = new Error('Perfil não encontrado.');
    err.status = 404;
    throw err;
  }

  if (profile.plano === 'ilimitado') {
    return { consumido: false, ilimitado: true, creditos_antes: profile.creditos, creditos_depois: profile.creditos };
  }

  if (profile.creditos <= 0) {
    const err = new Error('Créditos insuficientes.');
    err.status = 402;
    err.semCreditos = true;
    throw err;
  }

  const novosCreditos = profile.creditos - 1;
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ creditos: novosCreditos })
    .eq('id', userId);

  if (updateError) {
    const err = new Error('Erro ao consumir crédito.');
    err.status = 500;
    throw err;
  }

  await supabase.from('uso_creditos').insert({
    user_id: userId,
    ferramenta,
    creditos_antes: profile.creditos,
    creditos_depois: novosCreditos
  });

  return { consumido: true, ilimitado: false, creditos_antes: profile.creditos, creditos_depois: novosCreditos };
}

function gerarRelatorioConsolidado(ferramentas = {}, nomeProjeto = 'Projeto sem nome') {
  const resultados = {};
  const ferramentasGeradas = [];
  let totalRegistros = 0;

  ['materiais', 'tomadas', 'padraoEntrada', 'condutores'].forEach((toolKey) => {
    const entries = ensureArrayEntries(ferramentas[toolKey]).filter(Boolean);
    if (!entries.length) return;

    resultados[toolKey] = entries.map((entry, index) => buildRegistro(toolKey, entry, index));
    ferramentasGeradas.push({
      chave: toolKey,
      nome: TOOL_LABELS[toolKey],
      quantidade: resultados[toolKey].length
    });
    totalRegistros += resultados[toolKey].length;
  });

  if (!ferramentasGeradas.length) {
    throw new Error('Nenhuma ferramenta salva foi enviada para geração.');
  }

  return {
    nome_projeto: nomeProjeto,
    gerado_em: new Date().toISOString(),
    ferramentas_geradas: ferramentasGeradas,
    total_ferramentas: ferramentasGeradas.length,
    total_registros: totalRegistros,
    resultados,
    observacao_geral: 'Cada item salvo em cada ferramenta foi processado individualmente. Itens de TUE dependem dos equipamentos efetivamente previstos e, quando não informados, aparecem somente como observação opcional.'
  };
}

module.exports = {
  NORMA_REFERENCIAS,
  TOOL_LABELS,
  DICIONARIO,
  LUMINARIAS,
  calcularTomadas,
  calcularMateriais,
  calcularPadraoEntrada,
  calcularCondutores,
  consumirCreditoSeNecessario,
  gerarRelatorioConsolidado
};
