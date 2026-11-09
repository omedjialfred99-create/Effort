const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

app.get('/about', (req, res) => {
  res.send('Yo on avance together!');
});

app.get('/rendez-vous', (req, res) => {

  const rendezVous = [
    {
      id: 1,
      date: '2023-07-01',
      time: '10:00 AM',
    },
    {
      id:2,
      date: '2023-07-01',
      time: '10:15 PM',
    }
  ];
  res.json(rendezVous);
});