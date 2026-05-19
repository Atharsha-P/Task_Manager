const mongoose = require('mongoose');

const STATUSES = ['Planned', 'In Progress', 'Complete'];

const taskSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'Planned',
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Task', taskSchema);
module.exports.STATUSES = STATUSES;