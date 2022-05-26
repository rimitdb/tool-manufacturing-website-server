const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();


// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2omxo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorize access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });

}

async function run() {
    try {
        await client.connect();
        const toolCollection = client.db("ToolManuFac").collection("tools");
        const orderCollection = client.db("ToolManuFac").collection("order");
        const userCollection = client.db("ToolManuFac").collection("users");
        const reviewCollection = client.db("ToolManuFac").collection("reviews");


        // Product API

        app.get('/tool', async (req, res) => {
            const query = {};
            const cursor = toolCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools)
        });

        app.post("/tool", async (req, res) => {
            const newProduct = req.body;
            const result = await toolCollection.insertOne(newProduct);
            res.send(result);
        });

        app.delete("/tool/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolCollection.deleteOne(query);
            res.send(result);
        });

        // User API

        app.get('/user', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = userCollection.find(query);
            const users = await cursor.toArray();
            res.send(users);
        });

        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin });

        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const reqSender = req.decoded.email;
            const reqSenderAcc = await userCollection.findOne({ email: reqSender });
            if (reqSenderAcc.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);
            }
            else {
                res.status(403).send({ message: 'Unauthorize Access' });
            }

        });


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateUser = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateUser, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, accessToken: token });
        });

        // Get Tool API

        app.get('/tool/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await toolCollection.findOne(query);
            res.send(tool);
        });

        //Update Quantity API

        app.put('/tool/:id', async (req, res) => {
            const id = req.params.id;
            const updated = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updatedQuantity = {
                $set: {
                    order_quantity: updated.updateQuantity
                },
            }
            const result = await toolCollection.updateOne(filter, updatedQuantity, options);
            res.send(result);
        });

        //Order Info API

        app.get("/order", async (req, res) => {
            const query = {};
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });


        app.get('/order', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            const authorization = req.headers.authorization;
            if (email === decodedEmail) {
                const query = { email: email };
                const orders = await orderCollection.find(query).toArray();
                res.send(orders);
            }
            else {
                return res.status(403).send({ message: 'Forbidden User' })
            }
        });

        app.post('/order', async (req, res) => {
            const order = req.body;
            const query = { toolId: order.toolId, email: order.email };
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        //Update Quantity

        app.get('/updateQuantity', async (req, res) => {
            const order_quantity = req.query.order_quantity;

            const tools = await toolCollection.find().toArray();

            const query = { order_quantity: order_quantity };
            const orders = await orderCollection.find(query).toArray();

            tools.forEach(tool => {
                const toolOrders = orders.filter(order => order.toolName === tool.name);
                const ordered = toolOrders.map(o => o.order_quantity);
                // const availableStock = tool.order_quantity.filter(q => !ordered.includes(q));
                // tool.availableStock = availableStock;
                tool.ordered = toolOrders.map(o => o.order_quantity);
            })
            res.send(tools);
        });

        // Order Delete API

        app.get('/orders', async (req, res) => {
            const id = req.query.toolId;
            const query = { _id: id };
            const results = await orderCollection.find(query).toArray();
            res.send(results);
        });

        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
        });

        // Review API

        app.get('/review', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const reviews = await cursor.toArray();
            res.send(reviews)
        });

        app.post("/review", async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

    }
    finally {

    }
}

run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('Project-12-server-running')
});

app.listen(port, () => {
    console.log('Listening to port', port);
});