require("dotenv").config();
const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();

const cors = require("cors");
const jwt = require("jsonwebtoken"); //No.01_install No.02 const jwt = require('jsonwebtoken');

// require("dotenv").config();
const port = process.env.PORT || 5000;

// midleware
app.use(cors());
app.use(express.json());

// const { MongoClient, ServerApiVersion, |ObjectId delete korar jonne lagbe| } = require("mongodb");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); // ✅ ObjectId ইম্পোর্ট

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yeymv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const menuCollection = client.db("genZrdb").collection("menu");
    const reviewsCollection = client.db("genZrdb").collection("reviews");
    const cartsCollection = client.db("genZrdb").collection("carts");
    const userCollection = client.db("genZrdb").collection("users");
    const paymentCollection = client.db("genZrdb").collection("payments");

    // ===============================
    // 🔐 MIDDLEWARE SECTION (IMPORTANT)
    // ===============================

    // MiddleWere VERIFY
    // ⬆️⬆️⬆️ এই middleware আগে আনা হয়েছে
    // কারণ: const function hoist হয় না, route এর আগে থাকতে হবে
    const verifyToken = (req, res, next) => {
      console.log("inside verify Token", req.headers.authorization);

      if (!req.headers.authorization) {
        return res
          .status(401)
          .send({ message: "forbidden - access Line 52 INDEX" });
      }

      const token = req.headers.authorization.split(" ")[1];

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res
            .status(403)
            .send({ message: "forbidden Access  LINE 59 INDX" });
        }

        req.decoded = decoded;
        next();
      });
    };

    // VERIFY Admin MiddleWere (admin step no.4)
    // ⬆️⬆️⬆️ এটাও route এর আগে আনা হয়েছে
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);

      const isAdmin = user?.role === "admin";

      if (!isAdmin) {
        return res
          .status(403)
          .send({ message: "forbidden access verify ADMIN false" });
      }

      next();
    };

    // ===============================
    // 🔑 JWT API
    // ===============================

    // No 03.jwt Api make
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // ===============================
    // 📦 PUBLIC APIs MENU
    // ===============================

    // Data(Menu) Show in Ui (read)
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    // Single ID Data(Menu) Show in Ui (read)
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.findOne(query);
      res.send(result);
    });

    // Data(Menu item Add) send data in mongoDB (read)
    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });

    // Patch MENU ITEM|Edit & Update  verifyToken, verifyAdmin,
    app.patch("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: item.name,
          recipe: item.recipe,
          image: item.image,
          category: item.category,
          price: item.price,
        },
      };

      const result = await menuCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    //--------------
    //   ITEM
    //--------------
    // MENU ITEM DELETE
    app.delete("/item/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });
    // ------------------------------
    //        Review
    // ------------------------------
    // Data(Reviews) Show in Ui (read)
    app.get("/reviews", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // ===============================
    // 🛒 CART APIs
    // ===============================

    // Data(Profile) Show in Ui (read)
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    // Item Add
    app.post("/carts", async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result);
    });

    // Delete CART
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    // ===============================
    // 👤 USER APIs
    // ===============================

    //User Information Storage
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };

      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null });
      }

      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Dynamically Admin make with api (no.1)
    // ⚠️ এই route এখন ঠিকমতো কাজ করবে
    // Ui-তে ইউজারের Role করতে শো করতে get. Operation (এডমিন হলে :Admin / ইউজার হলে :User)
    app.get("/user/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email) {
        return res
          .status(403)
          .send({ message: "unauthorized access verify TOKEN False" });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);

      let admin = false;
      if (user) {
        admin = user?.role === "admin";
        // note second commit
      }

      res.send({ admin });
    });

    // Patch USER|Make Admin USER|Click kore Admin a rupantor
    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            role: "admin",
          },
        };

        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      },
    );

    // Delete USER
    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // Get ALL users (Admin only)
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    //==================================
    // PAYMENT
    //==================================
    // POST API FOR CREATE PAYMENT Proccesh Successsfully
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // POST Payment History Data in Payments Collection
    //const paymentCollection = client.db("genZrdb").collection("payments");
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //now delete PAID item from cart
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const deletePayementItem = await cartsCollection.deleteMany(query);
      res.send(paymentResult, deletePayementItem);
    });

    // PAYMENT HISTORY GET Ui Show
    app.get("/paymenthistory/:email", verifyToken, async (req, res) => {
      const query = { email: req.params.email };
      if (req.params.email !== req.decoded.email) {
        return res
          .stutas(403)
          .send({ message: "forbidden access LINE 300 INDX" });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    // app.get("/order/:email", verifyToken, async (req, res) => {
    //   const query = { email: req.params.email };
    //   if (req.params.email !== req.decoded.email) {
    //     return res
    //       .stutas(403)
    //       .send({ message: "forbidden access LINE 300 INDX" });
    //   }
    //   const result = await paymentCollection.find(query).toArray();
    //   res.send(result);
    // });
    
//=========================================
//  ADMIN HOME  Stats Analytics for ADMIN Home
//=========================================
    app.get("/admin-stats", verifyToken, verifyAdmin, async (req, res) => {
      const customers = await userCollection.estimatedDocumentCount();
      const products = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      // 👉 total revenue (সব price যোগ)
      const revenueResult = await paymentCollection.aggregate([
          { $group: { _id: null, totalRevenue: { $sum: "$price" } } },
        ]).toArray();
      const revenue =
        revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0; // 👉 যদি কোনো payment না থাকে তখন 0

      res.send({
        customers,
        products,
        orders,
        revenue,
      });
    });


      //   ORDER Chart STATS with MongoDB $Operator In BackEnd
      //----------------------------------------------------
    app.get("/order-stat",  async (req, res) => {
      const result = await paymentCollection.aggregate([
          { $unwind: "$menuIds" },
          {
            $addFields: {
              menuObjectId: { $toObjectId: "$menuIds" },
            },
          },
          {
            $lookup: {
              from: "menu",
              localField: "menuObjectId",
              foreignField: "_id",
              as: "orderMenuItems",
            },
          },
          { $unwind: "$orderMenuItems" },
          {
            $group: {
              _id: "$orderMenuItems.category",
              quantity: { $sum: 1 },
              revenue: { $sum: "$orderMenuItems.price" },
            },
          },
          //{ $sort: { quantity: -1 },} // চাইলে sort 
          // {
          //   $setWindowFields: {
          //     sortBy: { quantity: -1 },
          //     output: {
          //       serial: { $documentNumber: {} }, // এইটা 1,2,3...
          //     },
          //   },
          // },
          {
            $project: {
              _id: "$serial",
              categoryName: "$_id",
              quantity: 1,
              revenue: 1,
            },
          },
        ])
        .toArray();

      res.send(result);
    });
//-----------------------------------------
//  USER HOME  Stats Analytics for USER Home
//-----------------------------------------
    app.get("/user-stats",  async (req, res) => {
      const menu = await menuCollection.estimatedDocumentCount();
      const shop = await paymentCollection.estimatedDocumentCount();
      // const contact = await contactCollection.estimatedDocumentCount();
      res.send({
        menu,
        shop,
        // contact,
      });
    });

//    User home USER Activities
// -------------------------------
    // app.get('/user-stat-order-single-product-count/:email', async(req, res) => {
    //   const userOrder = await paymentCollection.estimatedDocumentCount(); 
    //   res.send({userOrder});
    // })
app.get('/user-stat-order-single-product-count/:email', async (req, res) => {
  const email = req.params.email;
        const menu = await menuCollection.estimatedDocumentCount();
      const shop = await paymentCollection.estimatedDocumentCount();
      const reviews = await reviewsCollection.estimatedDocumentCount();
            // const contact = await contactCollection.estimatedDocumentCount();
  const result = await paymentCollection.aggregate([
    { $match: { email: email } },
    {
      $project: {
        itemCount: {
          $size: { $ifNull: ["$menuIds", []] }
        }
      }
    },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: "$itemCount" }
      }
    }
  ]).toArray();

  const totalOrders = result[0]?.totalOrders || 0;

  res.send({ totalOrders, menu, shop, reviews });
});


    //////////////
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close(); // ❌ intentionally commented (server alive রাখতে)
  }
}

run().catch(console.dir);

// Lower part
app.get("/", (req, res) => {
  res.send("Gen-z Resturant is runnig now");
});

app.listen(port, () => {
  console.log(`Gen-Z Resturanr is Running on port ${port}`);
});
