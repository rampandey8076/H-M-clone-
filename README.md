# H&M Clone

A full-stack H&M e-commerce clone project, currently focused on building the backend first.

## Tech Stack

* Node.js
* Express.js
* MongoDB
* Mongoose

## Current Features

* Express server setup
* MongoDB connection
* Product model
* Product CRUD APIs
* JSON request/response handling

## API Routes

```text
POST   /api/products
GET    /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id
```

## Backend Structure

```text
backend/
├── server.js
└── src/
    ├── app.js
    ├── config/
    │   └── db.js
    ├── models/
    │   └── Product.js
    └── routes/
        └── productRoutes.js
```

## Status

Backend product API is working with MongoDB. Frontend development will be added next.
