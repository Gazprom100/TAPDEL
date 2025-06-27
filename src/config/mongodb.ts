import { MongoClient, ServerApiVersion, WriteConcern } from 'mongodb';

const MONGODB_URI = process.env.VITE_MONGODB_URI;
const MONGODB_DB = process.env.VITE_MONGODB_DB || 'tapdel';

if (!MONGODB_URI) {
  throw new Error(
    'Please define the VITE_MONGODB_URI environment variable. Example: mongodb+srv://user:password@cluster.mongodb.net/dbname'
  );
}

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  connectTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000,  // 45 seconds
  maxPoolSize: 50,
  minPoolSize: 10,
  retryWrites: true,
  retryReads: true,
  writeConcern: new WriteConcern('majority')
};

declare global {
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // В режиме разработки используем глобальную переменную
  if (!global.mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, options);
    global.mongoClientPromise = client.connect()
      .catch(error => {
        console.error('Failed to connect to MongoDB:', error);
        throw error;
      });
  }
  clientPromise = global.mongoClientPromise;
} else {
  // В продакшене создаем новое подключение
  client = new MongoClient(MONGODB_URI, options);
  clientPromise = client.connect()
    .catch(error => {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    });
}

export { MONGODB_DB };
export default clientPromise; 