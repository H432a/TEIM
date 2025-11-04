# Travel Expense and Itinerary Manager

A full-stack web application built with the MERN stack (MongoDB, Express, React, Node.js) for managing travel expenses and itineraries.

## Features

- **User Authentication**: Register and login with JWT-based authentication
- **Expense Management**: 
  - Add, edit, and delete expenses
  - Categorize expenses (Transportation, Accommodation, Food, Shopping, Entertainment, Other)
  - View expense statistics by category
  - Track expenses by date
- **Itinerary Management**:
  - Create and manage trip itineraries
  - Add multiple itinerary items with details (title, description, location, time, notes)
  - View upcoming trips
- **Dashboard**: Overview of expenses and upcoming trips

## Tech Stack

- **Frontend**: React, React Router, Axios
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Installation

### Backend Setup

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/travel-mgr
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

4. Make sure MongoDB is running on your system, or update `MONGODB_URI` to point to your MongoDB Atlas connection string.

5. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Project Structure

```
travel-mgr/
├── server/
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Expense.js
│   │   │   └── Itinerary.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── expenses.js
│   │   │   └── itineraries.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   └── index.js
│   ├── package.json
│   └── .env
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Expenses.js
│   │   │   ├── ExpenseModal.js
│   │   │   ├── Itineraries.js
│   │   │   └── ItineraryModal.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Expenses
- `GET /api/expenses` - Get all expenses (protected)
- `GET /api/expenses/:id` - Get a single expense (protected)
- `POST /api/expenses` - Create a new expense (protected)
- `PUT /api/expenses/:id` - Update an expense (protected)
- `DELETE /api/expenses/:id` - Delete an expense (protected)
- `GET /api/expenses/stats/category` - Get expenses by category (protected)

### Itineraries
- `GET /api/itineraries` - Get all itineraries (protected)
- `GET /api/itineraries/:id` - Get a single itinerary (protected)
- `POST /api/itineraries` - Create a new itinerary (protected)
- `PUT /api/itineraries/:id` - Update an itinerary (protected)
- `DELETE /api/itineraries/:id` - Delete an itinerary (protected)

## Usage

1. Start the MongoDB service
2. Start the backend server (`cd server && npm run dev`)
3. Start the frontend server (`cd client && npm start`)
4. Open `http://localhost:3000` in your browser
5. Register a new account or login
6. Start managing your travel expenses and itineraries!

## Notes

- Make sure to change the `JWT_SECRET` in production
- Update the `MONGODB_URI` to use MongoDB Atlas for production deployment
- The frontend is configured to proxy API requests to `http://localhost:5000` during development

