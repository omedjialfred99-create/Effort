const express = require('express');

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend est cool brotha!');
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
    }
    {
      id:2,
      date: '2023-07-01',
      time: '10:15 PM',
    }
  ];
  res.json(rendezVous);
});