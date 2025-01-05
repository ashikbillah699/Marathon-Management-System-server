const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();


app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j8csd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    const marathonCollection = client.db('MarathosDB').collection('Marathons');

    //get All Marathons
    app.get('/marathons', async(req, res)=>{
        const result = await marathonCollection.find().toArray();
        res.send(result);
    })

    //get marathon detail 
    app.get('/marathons/:id', async(req, res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const result = await marathonCollection.findOne(query);
        res.send(result);
    })

    // save marathos data in db
    app.post('/marathon/', async (req, res)=>{
        const marathonData = req.body;
        const result = await marathonCollection.insertOne(marathonData)
        console.log(marathonData);
        res.send(result);
    })

   
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res)=>{
    res.send('Hellow World');
})

app.listen(port, ()=>{
    console.log(`RecePoint is running in port ${port}`)
})