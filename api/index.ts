// api/index.ts
// Vercel serverless entry point — exports the Express app as a handler.
import mongoose from 'mongoose';
import app from '../src/app.js';
import { config } from '../src/config/bootstrap.js';

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000,
    });
    isConnected = true;
    console.log('✅ MongoDB connected (Vercel serverless)');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Vercel will call this handler for every request
export default async function handler(req: any, res: any) {
  try {
    await connectDB();
  } catch (error: any) {
    return res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
  return app(req, res);
}
