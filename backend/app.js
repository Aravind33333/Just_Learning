const express = require('express')();
const bodyParser = require('body-parser');
const cors = require('cors');   
const dotenv = require('dotenv');
const app = express;
app.use(bodyParser.json());
app.use(cors());
dotenv.config();
const PORT = process.env.BACKEND_PORT;
if (!PORT) {
    console.error("Error: BACKEND_PORT is not defined in environment variables.");
    process.exit(1);
}

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
