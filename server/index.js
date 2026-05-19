require('dotenv').config();

const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');

const { connectDatabase } = require('./src/lib/database');
const { createApp } = require('./src/app');

setGlobalOptions({ region: 'us-central1' });

let appPromise;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      await connectDatabase();
      return createApp();
    })();
  }

  return appPromise;
}

exports.api = onRequest(async (req, res) => {
  const app = await getApp();
  return app(req, res);
});
