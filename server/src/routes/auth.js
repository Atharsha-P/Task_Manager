const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { collection, doc, getDoc, getDocs, limit, query, updateDoc, where, addDoc } = require('firebase/firestore');

const { getDatabase } = require('../lib/database');
const { authMiddleware } = require('../middleware/auth');
const { createAppToken } = require('../utils/tokens');

const router = express.Router();

router.route('/google')
  .post(async (req, res, next) => {
    try {
      const { credential } = req.body;

      if (!credential) {
        return res.status(400).json({ message: 'Google credential is required' });
      }

      const audience = process.env.GOOGLE_CLIENT_ID;

      if (!audience) {
        return res.status(500).json({ message: 'GOOGLE_CLIENT_ID is not configured' });
      }

      const client = new OAuth2Client(audience);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience,
      });

      const payload = ticket.getPayload();

      if (!payload?.sub || !payload?.email) {
        return res.status(401).json({ message: 'Unable to verify Google account' });
      }

      const db = getDatabase();
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('googleId', '==', payload.sub), limit(1));
      const existingUserSnapshot = await getDocs(userQuery);

      const userData = {
        googleId: payload.sub,
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        picture: payload.picture || '',
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