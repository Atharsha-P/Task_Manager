const express = require('express');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/User');
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

      const user = await User.findOneAndUpdate(
        { googleId: payload.sub },
        {
          googleId: payload.sub,
          name: payload.name || payload.email.split('@')[0],
          email: payload.email,
          picture: payload.picture || '',
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );

      return res.json({
        token: createAppToken(user),
        user: {
          id: user._id,
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
    const user = await User.findById(req.user.id).lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      user: {
        id: user._id,
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