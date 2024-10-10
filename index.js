const express = require('express')
const app = express()
const jwt = require('jsonwebtoken')
const cookiePerser = require('cookie-parser')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(express.json())
app.use(cors(
  {
    origin: ['http://localhost:5173','https://car-doctor-54bbd.web.app','https://car-doctor-54bbd.firebaseapp.com'],
    credentials: true
  }
))
app.use(cookiePerser())
app.options('*', cors());


//creating custom middlewears


//creating verify token middleware 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yc8ov.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//creating middlewears
const logger = (req, res, next) => {
  console.log('Method & URL', req.method, req.url);
  next();
}
//creating verify token middlewear
const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  console.log('token in the middlewear', token);
  if (!token) {
    return res.status(401).send({ message: 'unauthorised access' })
  }
  jwt.verify(token, process.env.ACESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorised access' })
    }
    req.user = decoded;
    next();

  })
}
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const serviceCollection = client.db("carDoctor").collection("services"); //connecting collection
    const bookingCollection = client.db("carDoctor").collection("bookings"); //connecting collection
    //geting data from database

    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: { title: 1, price: 1, img: 1, service_id: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    })

    ///

    app.post('/bookings', async (req, res) => {
      const booking = req.body;

      const result = await bookingCollection.insertOne(booking);
      res.send(result)
    })

    app.get('/bookings', logger, verifyToken, async (req, res) => {
      console.log('owner info:', req.user);
      if (req.user?.email !== req.query?.email) {
        return res.status(403).send({ message: 'No access to other user info' })
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })

    //creating jwt token
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACESS_TOKEN_SECRET, { expiresIn: '1h' });
      res
        .cookie('token', token, cookieOptions)
        .send({ success: true });
    })
    app.post('/logout', async (req, res) => {
      const user = req.body;
      res.clearCookie('token', {...cookieOptions, maxAge: 0 }).send({ success: true });
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Car Doctor is running')
})

app.listen(port, () => {
  console.log(`Car Doctor listening on port:${port}`)
})