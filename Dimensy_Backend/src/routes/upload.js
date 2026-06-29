const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../lib/supabase');
const { requireAuth } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Apenas imagens são permitidas.'));
    }
    cb(null, true);
  },
});

// POST /api/upload/:type  (type = logo | cover)
router.post('/:type', requireAuth, upload.single('file'), async (req, res) => {
  const { type } = req.params;
  if (!['logo', 'cover'].includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido. Use logo ou cover.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const ext = req.file.originalname.split('.').pop() || 'jpg';
  const filePath = `${req.user.id}/${type}-${Date.now()}.${ext}`;
  const bucket = 'company-images';

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    return res.status(500).json({ error: 'Falha ao fazer upload: ' + uploadError.message });
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return res.json({ url: data.publicUrl });
});

module.exports = router;
