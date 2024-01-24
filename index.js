const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fcmyfrv.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const userCollection = client.db("houseHunterDb").collection("users");
    const houseCollection = client.db("houseHunterDb").collection("houses");

    //jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //middleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isHouseOwner = user?.role === "houseOwner";
      if (!isHouseOwner) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    //user related api
    //get the data in the db and send to the client
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // get request for the check the user admin or not
    app.get("/users/houseOwner/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let houseOwner = false;
      if (user) {
        houseOwner = user?.role === "houseOwner";
      }
      res.send({ houseOwner });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.post("/houses", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await houseCollection.insertOne(item);
      res.send(result);
    });

    app.get("/houses", async (req, res) => {
      const result = await houseCollection.find().toArray();
      res.send(result);
    });

   

    app.get("/houses/:email",verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await houseCollection.find(query).toArray();
      res.send(result);
    });

     //get operation for update the task data pass the db
     //get operation for update the menu data pass the db
    app.get("/menu/:id",async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await houseCollection.findOne(query);
        res.send(result);
      });

    //patch operation for update the task  and pass the database
    app.put("/houses/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
            name: item.name,
            address: item.address,
            city: item.city,
            bedrooms: item.bedrooms,
            bathrooms: item.bathrooms,
            roomSize: item.roomSize,
            date: item.date,
            rent: item.rent,
            number: item.number,
            description: item.description,
        },
      };
      const result = await houseCollection.updateOne(filter, updatedDoc);
      console.log(151,result);
      res.send(result);
    });

    app.delete("/houses/:id", async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
      const result = await houseCollection.deleteOne(query);
      res.send(result);
    });

    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("House Hunter is running...");
});

app.listen(port, () => {
  console.log(`House Hunter listening on port ${port}`);
});
