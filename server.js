const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express("app");
const path = require("path");
require("dotenv").config();
const { Client } = require("pg");

const port = process.env.port || 8000;

app.use(bodyParser.json());
app.use(express.static(__dirname + "/assets"));
app.use("/saveData", express.static(path.join(__dirname, "saveData")));

// app.use(express.static("."));
app.set("view engine", "ejs");

const dataFilePath = "./saveData/data.json";

// Allow CORS requests from any origin
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.options("/saveData", (req, res) => {
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.render("main");
});

app.get("/mainpage", (req, res) => {
  res.render("main.ejs");
});

app.get("/table", (req, res) => {
  res.render("table.ejs");
});

app.get("/tablelist", (req, res) => {
  fs.readFile(dataFilePath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error reading data.json");
    } else {
      res.json(JSON.parse(data));
    }
  });
});

app.post("/saveData", (req, res) => {
  const inputText = req.body.input.filename;
  const convertedText = req.body.textarea.convertedtext;

  const newData = {
    input: {
      filename: inputText,
    },
    textarea: {
      convertedtext: convertedText,
    },
  };

  app.post("/saveData", (req, res) => {});

  fs.readFile(dataFilePath, "utf8", (err, existingData) => {
    if (err) {
      // If data.json doesn't exist, create it and write the data to it
      const newDataArray = [newData];
      fs.writeFile(
        dataFilePath,
        JSON.stringify(newDataArray, null, 2),
        (err) => {
          if (err) {
            console.error(err);
            res.status(500).send("Error writing to data.json");
          } else {
            res.send("Data written to data.json successfully");
          }
        }
      );
    } else {
      // If data.json exists, read the existing data and append the new data to it
      const existingDataArray = existingData.length
        ? JSON.parse(existingData)
        : [];
      existingDataArray.push(newData);
      fs.writeFile(
        dataFilePath,
        JSON.stringify(existingDataArray, null, 2),
        (err) => {
          if (err) {
            console.error(err);
            res.status(500).send("Error writing to data.json");
          } else {
            res.send("Data appended to data.json successfully");
          }
        }
      );
    }
  });
});

app.listen(port, () => console.log(`Server listening on port ${port}`));

// const { Client } = require("pg");
// const fs = require("fs");

const connectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;
const client = new Client({
  connectionString: connectionString,
});

async function start() {
  try {
    await client.connect();
    console.log("Connected to database");

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS table_name (
        filename VARCHAR(200),
        convertedtext VARCHAR(200)
      )
    `;
    await client.query(createTableQuery);
    console.log("Table created successfully");
  } catch (err) {
    console.error("Error connecting to database:", err);
    throw err;
  }
}

async function insertData() {
  try {
    const data = await fs.promises.readFile(dataFilePath, "utf8");
    const jsonData = JSON.parse(data);

    const insertQuery =
      "INSERT INTO table_name (filename, convertedtext) VALUES ($1, $2)";

    for (const item of jsonData) {
      if (!item.filename || !item.input.filename) {
        console.error("Error inserting data: invalid data format");
        continue;
      }
      const values = [item.input.filename, item.textarea.convertedtext];
      const res = await client.query(insertQuery, values);
      console.log("Data inserted successfully");
    }
  } catch (err) {
    console.error("Error inserting data:", err);
  }
}

start()
  .then(() => {
    insertData();
  })
  .catch((err) => {
    console.error("Error starting the application:", err);
  });
