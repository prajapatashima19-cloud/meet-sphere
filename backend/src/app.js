import dotenv from "dotenv";
dotenv.config();
import passport from "./config/passport.js";
import express from "express";
import { createServer } from "node:http"; // connect express instance and socket
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import { connectToSocket } from "./controllers/socketManager.js";
import userRoutes from "./routes/userRoutes.js";


const app = express();
// server socket.io or app dono ko chlayega
const server = createServer(app); // app instance create kiya [app server ko dediya]
const io = connectToSocket(server); // socket.io bi dediya

app.set("port", process.env.PORT || 8080);
const allowedOrigins = [
  "http://localhost:5173",              // local dev (Vite default port)
  process.env.CLIENT_URL,               // production frontend (Render/Vercel)
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

// Passport ke liye session zaroori hai (sirf OAuth handshake ke waqt)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      sameSite: "none",
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/v1/users", userRoutes);

const start = async () => {
  try {
    const connectionDb = await mongoose.connect(process.env.MONGO_URL);
    console.log(`MongoDB connected: ${connectionDb.connection.host}`);

    server.listen(app.get("port"), () => {
      console.log("Listening to port!");
    });
  } catch (err) {
    console.log(err);
  }
};

start();
