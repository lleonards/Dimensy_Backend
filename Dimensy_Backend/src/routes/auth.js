const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');

router.post('/register', async (req, res) => {
  try {
    const { email, password, nome } = req.body;
    if (!email || !password || !nome) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios.' });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    });

    if (error) return res.status(400).json({ error: error.message });

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        nome,
        email,
        creditos: 3,
        plano: 'free'
      });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      return res.status(500).json({ error: 'Usuário criado, mas houve erro ao preparar o perfil inicial.' });
    }

    return res.status(201).json({ message: 'Usuário criado com sucesso! Você ganhou 3 créditos grátis.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: 'Email ou senha inválidos.' });

    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        nome: data.user.user_metadata?.nome
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'Refresh token não fornecido.' });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Sessão expirada.' });

    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

module.exports = router;
