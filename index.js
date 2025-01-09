const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://racepoint-7b5a0.web.app',
        'https://racepoint-7b5a0.firebaseapp.com'
        ],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(express.json());
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j8csd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// verify token 
const verifyToken = (req, res, next)=>{
    const token = req.cookies?.token;
    if(!token){
        return res.status(401).send({message: 'unauthorized access!!'});
    }
    jwt.verify(token,process.env.SECRET_KEY, (err, decoded)=>{
        if(err){
            return res.status(401).send({message: 'unauthorized access!!'});
        }
        req.user = decoded;
    })

    next()
}

async function run() {
    try {
        const marathonCollection = client.db('MarathosDB').collection('Marathons');
        const registrationCollection = client.db('MarathosDB').collection('ApplyMarathons');

        // generate jwt
        app.post('/jwt', async (req, res)=>{
            const email = req.body;
            const token = jwt.sign(email, process.env.SECRET_KEY, {expiresIn: '20d'});
            res
            .cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
            })
            .send({success: true});

        })

        // remove jwt
        app.get('/logout', async(req, res)=>{
            res
            .clearCookie('token', {
               maxAge: 0,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
            })
            .send({success: true})
        })

        //get All Marathons
        app.get('/marathons',verifyToken, async (req, res) => {
            const decodedEmail = req.user?.email;
            const email = req.query.email;
            // console.log('decodedEmail: ', decodedEmail);
            // console.log('Email : ', email);

            if(decodedEmail !== email){
                return res.status(403).send({message: "unauthorized access!!"});
            };

            const sort = req.query.sort;
            let options = {createdAt: sort === 'asc' ? 1 : -1};
            const result = await marathonCollection.find().sort(options).toArray();
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
        app.get('/marathonsSpecific/:email',verifyToken, async (req, res) => {
            const decodedEmail = req.user?.email;
            const email = req.params.email;
            const query = { "marathonCreater.email": email };
            // console.log('decodeEmail', decodedEmail)
            // console.log('parammail', decodedEmail)

            if(decodedEmail !== email){
                return res.status(403).send({message: 'unauthorized access!!'})
            }

            const result = await marathonCollection.find(query).toArray();
            res.send(result);
        })

        // get All Marathons posted by a specific user
        app.get('/registationsSpecific/:email', verifyToken, async (req, res) => {
            const decodedEmail = req.user?.email;
            const email = req.params.email;
            const search = req.query.search;

            //  console.log('decodeEmail', decodedEmail)
            // console.log('parammail', decodedEmail)

            if(decodedEmail !== email){
                return res.status(403).send({message: 'unauthorized access!!'})
            }

            console.log( search)
            const query = { email: email , ...(search && { marathonTitle:{
                $regex: search,
                $options: 'i'
            }})};
            const result = await registrationCollection.find(query).toArray();
            res.send(result);
        })

        // save marathos data in db
        app.post('/marathon',verifyToken, async (req, res) => {
            const decodedEmaiil = req.user?.email;
            const marathonData = req.body;
            const email = marathonData?.marathonCreater?.email;
            // console.log('decodeEmail', decodedEmaiil)
            // console.log('email:', email);

            if(decodedEmaiil !== email){
                return res.status(403).send({message: 'unauthorized access'})
            }
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