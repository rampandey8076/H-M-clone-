const express = require("express");

const app = express();

app.get("/", (req, res) => {
    res.send("hello world");
});

app.post("/", (req, res) => {
    res.send("POST request to the homepage");
});

app.get("/about", (req, res) => {
    res.send("this is the about page");
});

// PUT - Update
app.put("/", (req, res) => {
    res.send("PUT request - update something");
});

// DELETE - Delete
app.delete("/", (req, res) => {
    res.send("DELETE request - delete something");
});

// 404 handler
app.use((req, res) => {
    res.status(404).send("404 - Page not found");
});

module.exports = app;