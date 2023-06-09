const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();
const path = require("path");
require("dotenv").config();
const { Client } = require("pg");
const chokidar = require("chokidar");
const { Pool } = require("pg");


const PORT = process.env.PORT || 8000;

app.use(bodyParser.json());
app.use(express.static(__dirname + "/assets"));
app.use("/saveData", express.static(path.join(__dirname, "saveData")));
app.set("view engine", "ejs");

const dataFilePath = "./saveData/data.json";

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

//delete all txt files from the directory
app.delete("/delete-files", (req, res) => {
  const directory = "txtFiles";
  const directoryPath = path.join(__dirname, directory);

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "An error occurred while deleting the files." });
    }

    files.forEach((file) => {
      const filePath = path.join(directoryPath, file);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ message: "An error occurred while deleting the files." });
        }
      });
    });

    return res.json({ message: "All files deleted successfully." });
  });
});

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
// delete data from database
app.post("/deletesData", (req, res) => {
  pool.query("DELETE FROM table_data", (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error deleting data from table_data");
    } else {
      console.log(result.rowCount + " rows deleted from table_data");
      res.send("Data deleted from table_data successfully");
    }
  });
});

// Delete data.json file
app.post("/deleteData", (req, res) => {
  const dataPath = path.join(__dirname, "saveData", "data.json");
  fs.writeFile(dataPath, JSON.stringify([]), (err) => {
    if (err) throw err;
    console.log("Data deleted!");
    res.send("Data deleted!");
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

app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);

const connectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;
const client = new Client({
  connectionString: connectionString,
});

async function start() {
  try {
    await client.connect();
    console.log("Connected to database");

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS table_data (
        filename VARCHAR(200),
        convertedtext VARCHAR(100000)
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
    const selectQuery =
      "SELECT * FROM table_data WHERE filename = $1 AND convertedtext = $2";
    const insertQuery =
      "INSERT INTO table_data (filename, convertedtext) VALUES ($1, $2)";

    for (const item of jsonData) {
      if (!item.textarea || !item.textarea.convertedtext) {
        // console.error("Error inserting data: invalid data format");
        continue;
      }
      const values = [item.input.filename, item.textarea.convertedtext];
      const res = await client.query(selectQuery, values);
      if (res.rows.length === 0) {
        await client.query(insertQuery, values);
        console.log("Data inserted successfully");
      } else {
        // console.log("Data already exists in database");
      }
    }
  } catch (err) {
    // console.error("Error inserting data:", err);
  }
}

start()
  .then(() => {
    insertData();
  })
  .catch((err) => {
    console.error("Error starting the application:", err);
  });

// Watch data.json for changes and update the database accordingly
chokidar.watch(dataFilePath).on("change", async (path) => {
  try {
    const data = await fs.promises.readFile(path, "utf8");
    const jsonData = JSON.parse(data);
    const selectQuery =
      "SELECT * FROM table_data WHERE filename = $1 AND convertedtext = $2";
    const insertQuery =
      "INSERT INTO table_data (filename, convertedtext) VALUES ($1, $2)";

    for (const item of jsonData) {
      if (!item.textarea || !item.textarea.convertedtext) {
        console.error("Error inserting data: invalid data format");
        continue;
      }
      const values = [item.input.filename, item.textarea.convertedtext];
      const res = await client.query(selectQuery, values);
      if (res.rows.length === 0) {
        await client.query(insertQuery, values);
        console.log("Data inserted successfully");
      } else {
        // console.log("Data already exists in database");
      }
    }
  } catch (err) {
    console.error("Error inserting data:", err);
  }
});
