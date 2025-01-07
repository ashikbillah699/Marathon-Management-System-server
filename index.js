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
        const registrationCollection = client.db('MarathosDB').collection('ApplyMarathons');

        //get All Marathons
        app.get('/marathons', async (req, res) => {
            const result = await marathonCollection.find().toArray();
            res.send(result);
        })

        // get 6 Marathons data from database
        app.get('/limitMarathons', async (req, res) => {
            const result = await marathonCollection.find().limit(6).toArray();
            res.send(result);
        })

        //get marathon detail 
        app.get('/marathons/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await marathonCollection.findOne(query);
            res.send(result);
        })

        // get All Marathons posted by a specific user
        app.get('/marathonsSpecific/:email', async (req, res) => {
            const email = req.params.email;
            const query = { "marathonCreater.email": email };
            const result = await marathonCollection.find(query).toArray();
            res.send(result);
        })

        // get All Marathons posted by a specific user
        app.get('/registationsSpecific/:email', async (req, res) => {
            const email = req.params.email;
            const search = req.query.search;
            console.log( search)
            const query = { email: email , ...(search && { marathonTitle:{
                $regex: search,
                $options: 'i'
            }})};
            const result = await registrationCollection.find(query).toArray();
            res.send(result);
        })

        // save marathos data in db
        app.post('/marathon', async (req, res) => {
            const marathonData = req.body;
            const result = await marathonCollection.insertOne(marathonData)
            // console.log(marathonData);
            res.send(result);
        })

        // save user and Registration marathons data
        app.post('/registration', async(req, res)=>{
            const registrationData = req.body;

            // check again count from same user
            const query = {email: registrationData.email, marathonId:registrationData.marathonId};
            const alreadyExist = await registrationCollection.findOne(query);
            if(alreadyExist){
                return res.status(403).send({message: 'You have already placed a registration on the marathon!!'})
            }
            const result = await registrationCollection.insertOne(registrationData);

            // InCreace Total Register
            const filter = {_id: new ObjectId(registrationData.marathonId)}
            const updateData = {
                $inc:{
                    totalRegistrationCount: 1
                }
            }
            const updateCount = await marathonCollection.updateOne(filter, updateData);

            res.send(result);
        })

        // delete single marathon from database
        app.delete('/marathon/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await marathonCollection.deleteOne(query);
            res.send(result);
        })

        // delete single Registation from database
        app.delete('/registation/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await registrationCollection.deleteOne(query);
            res.send(result);
        })

        // update Marathon
        app.put('/marathonUpdate/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateData = req.body;
            const updateMarathon = {
                $set: {
                    marathonTitle: updateData.marathonTitle,
                    marathonImage: updateData.marathonImage,
                    location: updateData.location,
                    startRegistrationDate: updateData.startRegistrationDate,
                    endRegistrationDate: updateData.endRegistrationDate,
                    marathonStartDate: updateData.marathonStartDate,
                    runningDistance: updateData.runningDistance,
                    description: updateData.description,
                    createdAt: updateData.createdAt,
                    totalRegistrationCount: updateData.totalRegistrationCount
                }
            }
            const result = await marathonCollection.updateOne(filter, updateMarathon)
            res.send(result);
        })

        // update registration Information
        app.put('/registrationUpdate/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateData = req.body;
            const updateMarathon = {
                $set: {
                    marathonTitle: updateData.marathonTitle,
                    marathonStartDate: updateData.marathonStartDate,
                    email: updateData.email,
                    contactNumber: updateData.contactNumber,
                    firstName: updateData.firstName,
                    lastName: updateData.lastName,
                    additionalInfo: updateData.additionalInfo,
                    marathonId: updateData.marathonId,
                }
            }
            const result = await registrationCollection.updateOne(filter, updateMarathon)
            res.send(result);
        })


        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hellow World');
})

app.listen(port, () => {
    console.log(`RecePoint is running in port ${port}`)
})