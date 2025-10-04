const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();

// Database configuration
const generateCleanMongoURI = () => {
  const username = 'TAPDEL';
  const password = 'fpz%25sE62KPzmHfM';
  const cluster = 'cluster0.ejo8obw.mongodb.net';
  const database = 'tapdel';
  
  return `mongodb+srv://${username}:${password}@${cluster}/${database}?retryWrites=true&w=majority&appName=Cluster0`;
};

const MONGODB_URI = process.env.MONGODB_URI || generateCleanMongoURI();
const MONGODB_DB = process.env.MONGODB_DB || 'tapdel';

app.get('/api/health', async (req, res) => {
  try {
    let mongoStatus = 'disconnected';
    let userCount = 0;
    let leaderboardCount = 0;
    
    try {
      const client = new MongoClient(MONGODB_URI);
      await client.connect();
      const db = client.db(MONGODB_DB);
      
      userCount = await db.collection('users').countDocuments();
      leaderboardCount = await db.collection('leaderboard').countDocuments();
      
      await client.close();
      mongoStatus = 'connected';
    } catch (error) {
      console.error('MongoDB connection error:', error);
    }
    
    res.json({
      status: 'OK',
      mongodb: mongoStatus,
      userCount,
      leaderboardCount,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = app;
