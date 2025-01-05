const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 500;

app.use(cors());
app.use(express.json());

app.get('/', (req, res)=>{
    res.send('Hellow World');
})

app.listen(port, ()=>{
    console.log(`RecePoint is running in port ${port}`)
})