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

async function checkUsers() {
  const result = await db.query('SELECT * from users ORDER BY id ASC');
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

async function addCountry(countryCode) {
  await db.query(
    'INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)',
    [countryCode, currentUserId],
  );
}

async function addUser(name, color) {
  const result = await db.query(
    'INSERT INTO users (name, color) VALUES($1, $2) RETURNING id',
    [name, color],
  );
  const data = result.rows[0];
  const newUserId = data.id;

  return newUserId;
}

async function getCurrentColor() {
  const result = await db.query('SELECT color FROM users WHERE id=$1', [
    currentUserId,
  ]);
  const row = result.rows[0];
  const color = row.color;

  return color;
}

async function renderError(res, err) {
  const countries = await checkVisited();
  const users = await checkUsers();
  const color = await getCurrentColor(users);

  res.render('index.ejs', {
    countries,
    total: countries.length,
    error: err,
    users,
    color,
  });
}

app.get('/', async (req, res) => {
  const users = await checkUsers();
  const countries = await checkVisited();
  const color = await getCurrentColor(users);

  res.render('index.ejs', {
    countries: countries,
    total: countries.length,
    users: users,
    color,
  });
});

app.post('/add', async (req, res) => {
  const input = req.body.country;

  try {
    const countryCode = await getCountryCode(input);
    try {
      await addCountry(countryCode);
      res.redirect('/');
    } catch (err) {
      await renderError(res, 'Country has already been added, try again.');
      console.log(err);
    }
  } catch (err) {
    await renderError(res, 'Country name does not exist.');
    console.log(err);
  }
});

app.post('/user', async (req, res) => {
  if (req.body.add === 'new') {
    res.render('new.ejs');
  } else {
    currentUserId = req.body.user ?? 1;
    res.redirect('/');
  }
});

app.post('/new', async (req, res) => {
  try {
    currentUserId = await addUser(req.body.name, req.body.color);
    res.redirect('/');
  } catch (err) {
    console.log(err);
    currentUserId = 1;
    await renderError('Failed to create new user');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
