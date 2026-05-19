const express = require('express');
const { collection, doc, getDoc, getDocs, limit, query, updateDoc, where, addDoc } = require('firebase/firestore');

const { getDatabase, admin } = require('../lib/database');
const { authMiddleware } = require('../middleware/auth');
const { createAppToken } = require('../utils/tokens');

const router = express.Router();

// Accepts a Firebase ID token (field `credential` or `idToken`) issued by the
// client after signing in with Firebase Authentication. Verifies the token
// using the Admin SDK and upserts the user into Firestore.
router.route('/google')
  .post(async (req, res, next) => {
    try {
      const token = req.body.credential || req.body.idToken;

      if (!token) {
        return res.status(400).json({ message: 'ID token is required' });
      }

      if (!admin || !admin.auth) {
        return res.status(500).json({ message: 'Firebase Admin is not initialized on server' });
      }

      // Verify the Firebase ID token
      const decoded = await admin.auth().verifyIdToken(token).catch(() => null);

      if (!decoded || !decoded.uid || !decoded.email) {
        return res.status(401).json({ message: 'Unable to verify Firebase ID token' });
      }

      const db = getDatabase();
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('firebaseUid', '==', decoded.uid), limit(1));
      const existingUserSnapshot = await getDocs(userQuery);

      const userData = {
        firebaseUid: decoded.uid,
        name: decoded.name || decoded.email.split('@')[0],
        email: decoded.email,
        picture: decoded.picture || '',
        updatedAt: Date.now(),
      };

      let user;

      if (!existingUserSnapshot.empty) {
        const existingDoc = existingUserSnapshot.docs[0];
        await updateDoc(existingDoc.ref, userData);
        user = { id: existingDoc.id, ...existingDoc.data(), ...userData };
      } else {
        const createdDoc = await addDoc(usersRef, {
          ...userData,
          createdAt: Date.now(),
        });
        user = { id: createdDoc.id, ...userData };
      }

      return res.json({
        token: createAppToken(user),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture,
        },
      });
    } catch (error) {
      next(error);
    }
  })
  .all((req, res) => {
    res.status(405).json({ message: 'Method not allowed. Use POST /api/auth/google' });
  });

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const db = getDatabase();
    const userRef = doc(db, 'users', req.user.id);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userSnapshot.data();

    return res.json({
      user: {
        id: userSnapshot.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;