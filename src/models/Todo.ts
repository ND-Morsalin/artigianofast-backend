import mongoose, { Schema } from 'mongoose';

interface ITodo {
  title: string;
  completed: boolean;
}

const todoSchema = new Schema<ITodo>({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false }
});

export default mongoose.model<ITodo>('Todo', todoSchema);