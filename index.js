import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();
const app = express();
const port = 3000;

const db = new pg.Client({
  user: 'postgres',
  host: 'localhost',
  database: 'world',
  password: process.env.DB_PASSWORD,
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

let currentUserId = 1;

// let users = [
//   { id: 1, name: 'Angela', color: 'teal' },
//   { id: 2, name: 'Jack', color: 'powderblue' },
// ];

async function checkUsers() {
  const result = await db.query('SELECT * from users');
  return result.rows;
}

async function getCountryCode(country) {
  const result = await db.query(
    "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
    [country.toLowerCase()],
  );

  const data = result.rows[0];
  return data.country_code;
}

async function checkVisited() {
  const result = await db.query(
    'SELECT country_code FROM visited_countries WHERE user_id = $1',
    [currentUserId],
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
app.get('/', async (req, res) => {
  const users = await checkUsers();
  const countries = await checkVisited();
  res.render('index.ejs', {
    countries: countries,
    total: countries.length,
    users: users,
    color: 'teal',
  });
});
app.post('/add', async (req, res) => {
  const input = req.body.country;

  try {
    const countryCode = await getCountryCode(input);
    try {
      await db.query(
        'INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)',
        [countryCode, currentUserId],
      );
      res.redirect('/');
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post('/user', async (req, res) => {
  currentUserId = req.body.user;
  res.redirect('/');
});

app.post('/new', async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
