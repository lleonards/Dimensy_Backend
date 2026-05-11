const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const authMiddleware = require('../middleware/auth');
const { consumirCreditoSeNecessario, gerarRelatorioConsolidado } = require('../services/calculoHelpers');

const PROJECTS_BUCKET = process.env.SUPABASE_PROJECTS_BUCKET || 'dimensy-projects';

function totalizarEntradas(ferramentas = {}) {
  return ['materiais', 'tomadas', 'padraoEntrada', 'condutores']
    .reduce((acc, key) => acc + (Array.isArray(ferramentas[key]) ? ferramentas[key].length : (ferramentas[key] ? 1 : 0)), 0);
}

function slugify(value = '') {
  const normalized = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return normalized || 'projeto';
}

async function createSignedProjectUrl(bucket, path) {
  if (!bucket || !path) return null;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    console.error('Erro ao gerar link assinado do projeto:', error);
    return null;
  }

  return data?.signedUrl || null;
}

async function attachStorageUrl(project) {
  if (!project) return project;

  return {
    ...project,
    arquivo_json_url: await createSignedProjectUrl(project.storage_bucket, project.arquivo_json_path)
  };
}

async function uploadProjectSnapshot(project) {
  const safeProjectName = slugify(project.nome);
  const basePath = `${project.user_id}/${project.id}-${safeProjectName}`;
  const filePath = `${basePath}/projeto-completo.json`;

  const payload = {
    id: project.id,
    nome: project.nome,
    user_id: project.user_id,
    created_at: project.created_at,
    updated_at: project.updated_at,
    ultima_geracao_em: project.ultima_geracao_em,
    total_registros: project.total_registros,
    total_ferramentas: project.total_ferramentas,
    creditos_consumidos: project.creditos_consumidos,
    dados_entrada: project.dados_entrada,
    resultados: project.resultados
  };

  const content = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');

  const { error } = await supabase.storage
    .from(PROJECTS_BUCKET)
    .upload(filePath, content, {
      contentType: 'application/json; charset=utf-8',
      upsert: true
    });

  if (error) {
    throw error;
  }

  return {
    storage_bucket: PROJECTS_BUCKET,
    arquivo_json_path: filePath,
    arquivo_json_mime: 'application/json',
    arquivo_json_tamanho: content.length
  };
}

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projetos')
      .select('id, nome, total_registros, total_ferramentas, creditos_consumidos, created_at, updated_at, ultima_geracao_em, storage_bucket, arquivo_json_path, arquivo_json_mime, arquivo_json_tamanho')
      .eq('user_id', req.user.id)
      .order('ultima_geracao_em', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar histórico de projetos.' });
    }

    const projetos = await Promise.all((data || []).map(attachStorageUrl));
    return res.json({ projetos });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar histórico de projetos.' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projetos')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Projeto não encontrado.' });
    }

    return res.json({ projeto: await attachStorageUrl(data) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao buscar projeto.' });
  }
});

router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const nomeProjeto = String(req.body?.nome_projeto || '').trim();
    const ferramentas = req.body?.ferramentas || {};

    if (!nomeProjeto) {
      return res.status(400).json({ error: 'Informe um nome para o projeto antes de gerar.' });
    }

    const totalRegistros = totalizarEntradas(ferramentas);
    if (!totalRegistros) {
      return res.status(400).json({ error: 'Salve pelo menos um item em alguma ferramenta antes de gerar.' });
    }

    const relatorio = gerarRelatorioConsolidado(ferramentas, nomeProjeto);
    const credito = await consumirCreditoSeNecessario(req.user.id, `geracao-projeto:${nomeProjeto}`);

    const payloadProjeto = {
      user_id: req.user.id,
      nome: nomeProjeto,
      dados_entrada: ferramentas,
      resultados: relatorio,
      total_registros: relatorio.total_registros,
      total_ferramentas: relatorio.total_ferramentas,
      creditos_consumidos: credito.consumido ? 1 : 0,
      ultima_geracao_em: relatorio.gerado_em
    };

    const { data, error } = await supabase
      .from('projetos')
      .insert(payloadProjeto)
      .select('*')
      .single();

    if (error || !data) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar o projeto gerado.' });
    }

    let projetoSalvo = data;

    try {
      const storageMeta = await uploadProjectSnapshot(projetoSalvo);
      const { data: projetoAtualizado, error: updateError } = await supabase
        .from('projetos')
        .update(storageMeta)
        .eq('id', projetoSalvo.id)
        .eq('user_id', req.user.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Erro ao salvar snapshot no metadado do projeto:', updateError);
      } else if (projetoAtualizado) {
        projetoSalvo = projetoAtualizado;
      }
    } catch (storageError) {
      console.error('Erro ao enviar projeto para o Supabase Storage:', storageError);
    }

    const projetoComArquivo = await attachStorageUrl(projetoSalvo);

    return res.json({
      success: true,
      mensagem: 'Projeto gerado com sucesso.',
      projeto: projetoComArquivo,
      creditos: credito,
      relatorio: {
        ...relatorio,
        projeto_id: projetoComArquivo.id,
        creditos_consumidos: projetoComArquivo.creditos_consumidos,
        storage_json_path: projetoComArquivo.arquivo_json_path || null,
        storage_json_url: projetoComArquivo.arquivo_json_url || null
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({
      error: err.message || 'Erro ao gerar projeto.',
      semCreditos: Boolean(err.semCreditos)
    });
  }
});

module.exports = router;
