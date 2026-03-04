import mongoose from 'mongoose';

export async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  mongoose.connection.on('open', () => {
    console.log('MongoDB connection established');
  });

  mongoose.connection.on('error', (err: unknown) => {
    console.error('MongoDB connection error:', err);
  });

  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    return mongoose.connection;
  } catch (error) {
    console.error('Initial MongoDB connection error:', error);
    throw error;
  }
}
