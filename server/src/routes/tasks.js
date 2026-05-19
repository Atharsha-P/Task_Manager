const express = require('express');

const Task = require('../models/Task');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const tasks = await Task.find({ owner: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description = '', dueDate = '', status = 'Planned' } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    const task = await Task.create({
      owner: req.user.id,
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate ? new Date(dueDate) : null,
      status,
    });

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

router.patch('/:taskId/status', async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!Task.STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid task status' });
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.taskId, owner: req.user.id },
      { status },
      { new: true },
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

module.exports = router;