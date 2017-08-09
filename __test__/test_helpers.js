import { createLoaders } from '../src/server/models/';
import thinky from 'thinky';
import dumbThinky from 'rethink-knex-adapter';

// TODO: Load these values from env for real
const testDB = 'testy'
const mainDB = 'spoke'

// Here's how we used to connect to thinky

// const thinkyTest = thinky({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   db: testDB,
//   authKey: process.env.DB_KEY
// });

// const testR = thinkyTest.r

// Set up pg test database connection
// First create the test database as a superuser:
// CREATE USER spoketest WITH PASSWORD 'spoketest';
// CREATE DATABASE spoketest WITH OWNER spoketest;

// Copy all the tables from spoke database into the test database
// which i think we can do by temporarily setting test db creds in .env
// and running `npm run dev`


const config = {
  client: 'pg',
  connection: {
    host: 'localhost',
    port: 5432,
    database: 'spoke',
    password: 'spoke',
    user: 'spoke'
  }
}
console.log(config)

const Thinky = dumbThinky(config)

console.log(Thinky)

// async function createTestDatabase() {
//   const dbList = await testR.dbList();
//   if (dbList.indexOf(testDB) > -1) {
//     console.log("Test database " + testDB + " already exists.");
//   } else {
//     await testR.dbCreate(testDB);
//     await testR.db(mainDB).tableList().forEach(testR.db(testDB).tableCreate(testR.row));
//     console.log("created test database " + testDB + " and populated with models from main database " + mainDB)
//   }
// }  

// async function clearTestData() {
//   const tableList = await testR.db(testDB).tableList();
//   tableList.forEach(async function(tableName) {
//     await testR.db(testDB).table(tableName).delete()
//   });
//   console.log('truncated test database tables')
// }

async function setupTest() {
  // await createTestDatabase();
  await clearTestData();
}

// customize 
async function cleanupTest() {
  await clearTestData();
}

export function getContext(context) {
  return {
    ...context,
    req: {},
    loaders: createLoaders(),
  };
}

export { Thinky, setupTest, cleanupTest, createTestDatabase, getContext }

