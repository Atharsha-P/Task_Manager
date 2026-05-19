const express = require('express');
const {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} = require('firebase/firestore');

const { getDatabase } = require('../lib/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const STATUSES = ['Planned', 'In Progress', 'Complete'];

router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const db = getDatabase();
    const tasksRef = collection(db, 'tasks');
    const tasksQuery = query(tasksRef, where('ownerId', '==', req.user.id));
    const snapshot = await getDocs(tasksQuery);
    const tasks = snapshot.docs
      .map((taskDoc) => ({
        _id: taskDoc.id,
        ...taskDoc.data(),
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

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

    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid task status' });
    }

    const db = getDatabase();
    const now = Date.now();
    const payload = {
      ownerId: req.user.id,
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      status,
      createdAt: now,
      updatedAt: now,
    };

    const taskRef = await addDoc(collection(db, 'tasks'), payload);
    const task = { _id: taskRef.id, ...payload };

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

router.patch('/:taskId/status', async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid task status' });
    }

    const db = getDatabase();
    const taskRef = doc(db, 'tasks', req.params.taskId);
    const taskSnapshot = await getDoc(taskRef);

    if (!taskSnapshot.exists() || taskSnapshot.data().ownerId !== req.user.id) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await updateDoc(taskRef, {
      status,
      updatedAt: Date.now(),
    });

    const updatedTaskSnapshot = await getDoc(taskRef);
    const task = { _id: updatedTaskSnapshot.id, ...updatedTaskSnapshot.data() };

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

module.exports = router;