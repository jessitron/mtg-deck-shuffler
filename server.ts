import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));

app.post('/deck', (req, res) => {
    const deckNumber = req.body['deck-number'];
    res.send(`<div id="deck-input">
        <p>You have chosen deck ${deckNumber}</p>
        <a href="/">Choose another deck</a>
    </div>`);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});