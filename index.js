const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();


// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2omxo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolCollection = client.db("ToolManuFac").collection("tools");
        const orderCollection = client.db("ToolManuFac").collection("order");

        app.get('/tool', async (req, res) => {
            const query = {};
            const cursor = toolCollection.find(query);
            const tools = await cursor.toArray();
            res.send(tools)
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
        })

        //Order Info API
        app.get('/order', async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const query = { email: email };
            const orders = await orderCollection.find(query).toArray();
            res.send(orders);
        })

        app.post('/order', async (req, res) => {
            const order = req.body;
            const query = { toolId: order.toolId, email: order.email };
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })

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

        })

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
})