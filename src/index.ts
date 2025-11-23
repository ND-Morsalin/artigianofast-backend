import express from 'express';
import mongoose from 'mongoose';
import todoRoutes from './routes/todoRoutes';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Connect to MongoDB (replace with your URI)
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/todo-app')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));
app.use(cors()); // Add this line
app.use('/api/todos', todoRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));