const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const { parse } = require('json2csv');
const path = require('path'); // 👈 add

const app = express();
const CSV_PATH = 'data/db.csv';

app.use(cors()); // CORS global (répond aussi aux preflight)
app.use(express.json());

// ⚠️ Servez vos fichiers statiques "public" comme avant (CSS/JS/images)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Servez les polices (et autres assets) avec headers précis
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.woff2')) {
      res.setHeader('Content-Type', 'font/woff2');
    } else if (filePath.endsWith('.woff')) {
      res.setHeader('Content-Type', 'font/woff');
    }
    // CORS + cache long (idéal pour les fonts fingerprintées)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Vary', 'Origin');
  }
}));

// --- tes routes API inchangées ---
app.get('/data', (req, res) => {
  const results = [];
  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (data) => {
      data.PlayCount = parseInt(data.PlayCount || '0', 10);
      results.push(data);
    })
    .on('end', () => res.json(results))
    .on('error', () => res.status(500).json({ error: 'Erreur lecture CSV.' }));
});

app.post('/increment', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre manquant.' });

  const data = [];
  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (row) => {
      row.PlayCount = parseInt(row.PlayCount || '0', 10);
      data.push(row);
    })
    .on('end', () => {
      let found = false;
      const updatedData = data.map(row => {
        if (row.Title === title) {
          found = true;
          row.PlayCount += 1;
        }
        return { ...row, PlayCount: row.PlayCount.toString() };
      });

      if (!found) return res.status(404).json({ error: 'Chanson non trouvée.' });

      try {
        const updatedCsv = parse(updatedData, { fields: Object.keys(updatedData[0]) });
        fs.writeFile(CSV_PATH, updatedCsv, (err) => {
          if (err) return res.status(500).json({ error: 'Erreur écriture CSV.' });
          return res.json({ message: `PlayCount incrémenté pour "${title}".` });
        });
      } catch {
        return res.status(500).json({ error: 'Erreur conversion CSV.' });
      }
    })
    .on('error', () => res.status(500).json({ error: 'Erreur lecture CSV.' }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
