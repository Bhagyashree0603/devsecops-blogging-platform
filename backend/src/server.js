require('dotenv').config();
const app = require('./app');
const { initDb } = require('./db');
const port = process.env.PORT || 4000;
initDb().then(()=>app.listen(port,()=>console.log(`Blogging API listening on ${port}`))).catch(err=>{console.error('Database initialization failed',err);process.exit(1);});
