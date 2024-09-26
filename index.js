const express = require('express')
const app =express()
const jwt = require('jsonwebtoken')
const cors = require('cors')
const cookiePerser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(express.json())
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}))
app.use(cookiePerser())

//creating custom middlewears


//creating verify token middleware 
const verifyToken = async(req,res,next)=>{
  const token = req.cookies?.token;
  if(!token){
    return res.status(401).send({message:'unauthorized access'})
  }
  jwt.verify(token,process.env.ACESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:'unauthorized access'})
    }
    console.log('value in the token', decoded);
    req.user=decoded;
    next();
  })
}
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yc8ov.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const serviceCollection = client.db("carDoctor").collection("services"); //connecting collection
    const bookingCollection = client.db("carDoctor").collection("bookings"); //connecting collection
    //geting data from database

    app.get("/services",async(req,res)=>{
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get("/services/:id", async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const options = {
        // Include only the `title` and `imdb` fields in the returned document
        projection: {title: 1, price: 1, img:1, service_id:1 },
      };
      const result = await serviceCollection.findOne(query,options);
      res.send(result);
    })

    ///

    app.post('/bookings', async(req,res)=>{
      const booking =req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result)
    })

    app.get('/bookings',verifyToken, async(req,res)=>{
     
      console.log(req.query.email);
      console.log('user in the valid token',req.user)
      // if(req.query.email !== req.user.email){
      //   return res.status(403).send({message:'forbiden access'})
      // }
      let query={};
      if(req.query?.email){
        query={email: req.query.email}
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })

    app.delete("/bookings/:id",async(req,res)=>{
      const id = req.params.id;
      const query ={_id: new ObjectId(id)};
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })

    //jwt 
    app.post('/jwt',(req,res)=>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user,process.env.ACESS_TOKEN_SECRET,{expiresIn:'1h'});
      res
      .cookie('token',token,{
        httpOnly: true,
        secure: false,
      })
      .send({success:true});
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/',(req,res)=>{
    res.send('Car Doctor is running')
})

app.listen(port,()=>{
    console.log(`Car Doctor listening on port:${port}`)
})