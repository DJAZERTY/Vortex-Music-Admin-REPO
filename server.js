const express = require('express');
const cors = require('cors');
const fs = require('fs');
const csv = require('csv-parser');
const { parse } = require('json2csv');

const app = express();
const CSV_PATH = 'data/db.csv';

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// GET /data : retourne tout le CSV en JSON, PlayCount en entier, le reste en string
app.get('/data', (req, res) => {
  const results = [];
  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (data) => {
      // Convertir uniquement PlayCount en entier
      data.PlayCount = parseInt(data.PlayCount || '0', 10);
      // ReleaseDate et autres restent en string
      results.push(data);
    })
    .on('end', () => res.json(results))
    .on('error', () => res.status(500).json({ error: 'Erreur lecture CSV.' }));
});

// POST /increment : incrémente PlayCount d'une chanson donnée
app.post('/increment', (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Titre manquant.' });
  }

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
        return {
          ...row,
          PlayCount: row.PlayCount.toString(), // converti en string pour CSV
          // ReleaseDate et autres champs restent intacts
        };
      });

      if (!found) {
        return res.status(404).json({ error: 'Chanson non trouvée.' });
      }

      try {
        const updatedCsv = parse(updatedData, { fields: Object.keys(updatedData[0]) });

        fs.writeFile(CSV_PATH, updatedCsv, (err) => {
          if (err) {
            return res.status(500).json({ error: 'Erreur écriture CSV.' });
          }
          return res.json({ message: `PlayCount incrémenté pour "${title}".` });
        });
      } catch (err) {
        return res.status(500).json({ error: 'Erreur conversion CSV.' });
      }
    })
    .on('error', () => res.status(500).json({ error: 'Erreur lecture CSV.' }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
