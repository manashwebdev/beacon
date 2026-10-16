import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";

const uri = process.env.MONGODB_URI;
const port = Number(process.env.PORT) || 4000;

if (!uri) {
  console.error("MONGODB_URI is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("JWT_SECRET must be set in production.");
  process.exit(1);
}

mongoose
  .connect(uri)
  .then(() => app.listen(port, () => console.log(`Beacon API listening on port ${port}`)))
  .catch((e) => {
    console.error("MongoDB connection failed:", e.message);
    process.exit(1);
  });
