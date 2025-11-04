# SlotSwapper SlotSwapper

A full-stack, peer-to-peer time-slot scheduling application. Users can post their calendar slots as "swappable" and request to exchange them with slots from other users.

This project was built as a comprehensive web development assignment, demonstrating a complete PERN (PostgreSQL, Express, React, Node.js) stack with secure authentication and transactional database logic.

##  Live Demo

You can view the live deployed application here:
**[https://your-project-name.vercel.app](https://your-project-name.vercel.app)**
*(Replace with your actual Vercel URL)*

## 🛠 Tech Stack

* **Frontend:** React (Vite), React Router
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL (using Neon for production)
* **Authentication:** JWT (JSON Web Tokens), `bcryptjs` for password hashing
* **Deployment:** Vercel

---

##  Design Choices

* **Full-Stack (PERN):** The app is built with a React frontend and a Node/Express/PostgreSQL backend. This provides a robust, scalable, and popular architecture.
* **Stateless Auth:** JWT (JSON Web Tokens) are used for managing user sessions. The token is stored in the client's `localStorage` and sent in the `Authorization` header for all protected API requests.
* **Atomic Swaps:** The most critical backend feature is the logic for accepting a swap (`POST /api/swap/response`). This operation is wrapped in a **PostgreSQL transaction** (`BEGIN`/`COMMIT`/`ROLLBACK`). This ensures that the exchange of slot owners is **atomic**—it either fully completes or fails entirely. This prevents any possibility of data corruption (e.g., one user losing their slot while the other doesn't receive it).
* **Status-Based Logic:** An `enum` (`event_status`) is used in the database to manage the state of a slot (`BUSY`, `SWAPPABLE`, `SWAP_PENDING`). This makes the logic clear and prevents users from requesting swaps on slots that are already part of a pending request.

---

##  How to Run Locally

To set up and run this project on your local machine, you will need `Node.js` and a local `PostgreSQL` server installed.

### 1. Prerequisites

* Node.js (v20.19+ or v22.12+)
* Git
* A PostgreSQL server running locally.

### 2. Clone the Repository

```bash
git clone [https://github.com/VarZ-96/SlotSwapper.git](https://github.com/VarZ-96/SlotSwapper.git)
cd SlotSwapper
```

### 3. Backend Setup

The backend server runs on `localhost:5000`.

1.  **Navigate to the backend folder:**
    ```bash
    cd backend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up your local database:**
    * Create a new PostgreSQL database. Let's call it `slot_swapper`.
4.  **Create your environment file:**
    * Create a file named `.env` in the `/backend` folder.
    * Paste the following into it, replacing the values with your local database details and a new secret.
    ```
    # Your PostgreSQL connection string
    # FORMAT: postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE_NAME]
    DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/slot_swapper"

    # Your secret key for signing JWTs
    JWT_SECRET="a_very_long_and_random_secret_key"
    ```
5.  **Run the Database Migration (Schema):**
    * Run the following SQL script in your `slot_swapper` database (using `psql` or a GUI like Postico/DBeaver) to create all the necessary tables.
    ```sql
    -- Create the custom enum types
    CREATE TYPE event_status AS ENUM ('BUSY', 'SWAPPABLE', 'SWAP_PENDING');
    CREATE TYPE swap_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

    -- Users Table
    CREATE TABLE users (
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Events (Slots) Table
    CREATE TABLE events (
        event_id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        status event_status NOT NULL DEFAULT 'BUSY',
        owner_id INT NOT NULL,
        CONSTRAINT fk_owner
            FOREIGN KEY(owner_id) 
            REFERENCES users(user_id)
            ON DELETE CASCADE
    );

    -- Swap Requests Table
    CREATE TABLE swap_requests (
        request_id SERIAL PRIMARY KEY,
        requester_id INT NOT NULL,
        responder_id INT NOT NULL,
        requester_slot_id INT NOT NULL,
        responder_slot_id INT NOT NULL,
        status swap_status NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        
        CONSTRAINT fk_requester FOREIGN KEY(requester_id) REFERENCES users(user_id) ON DELETE CASCADE,
        CONSTRAINT fk_responder FOREIGN KEY(responder_id) REFERENCES users(user_id) ON DELETE CASCADE,
        CONSTRAINT fk_requester_slot FOREIGN KEY(requester_slot_id) REFERENCES events(event_id) ON DELETE CASCADE,
        CONSTRAINT fk_responder_slot FOREIGN KEY(responder_slot_id) REFERENCES events(event_id) ON DELETE CASCADE
    );
    ```
6.  **Start the backend server:**
    ```bash
    npm start
    ```
    Your backend is now running at `http://localhost:5000`.

### 4. Frontend Setup

The React app runs on `localhost:5173` (or the next available port).

1.  **Open a new terminal window.**
2.  **Navigate to the frontend folder:**
    ```bash
    cd frontend
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Start the frontend dev server:**
    ```bash
    npm run dev
    ```

Your application is now fully running. Open `http://localhost:5173` in your browser to use the app.

---

## API Endpoints

All endpoints are prefixed with `/api`. All **Event** and **Swap** routes are protected and require a valid JWT Bearer token in the `Authorization` header.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **Auth** | | |
| `POST` | `/auth/signup` | Creates a new user and returns a JWT. |
| `POST` | `/auth/login` | Logs in a user and returns a JWT. |
| **Events** | | **(Protected)** |
| `GET` | `/events/my-events` | Fetches all events owned by the logged-in user. |
| `POST` | `/events` | Creates a new event for the user. (Default status: 'BUSY') |
| `PUT` | `/events/:eventId` | Updates an event's details or status (e.g., 'BUSY' -> 'SWAPPABLE'). |
| `DELETE` | `/events/:eventId` | Deletes an event owned by the user. |
| **Swap Logic** | | **(Protected)** |
| `GET` | `/swap/swappable-slots` | Gets all events from *other* users that are marked 'SWAPPABLE'. |
| `POST` | `/swap/request` | Creates a new swap request. Sets both slots to 'SWAP_PENDING'. |
| `POST` | `/swap/response/:requestId` | Responds to a swap request (Accept or Reject). |
| `GET` | `/swap/requests/incoming` | Gets all 'PENDING' requests for the logged-in user. |
| `GET` | `/swap/requests/outgoing` | Gets all requests initiated by the logged-in user. |

---

## Assumptions & Challenges

### Assumptions

* A user can only swap one of their slots for one of another user's slots (1-to-1 swap).
* All times are handled by the database in `TIMESTAMPTZ` (Timestamp with Timezone) format to ensure consistency, and are formatted by the client's browser for display.
* An event in a `SWAP_PENDING` state is "locked" and cannot be offered in other swaps until the pending request is resolved (accepted or rejected).

### Challenges

* **Data Integrity:** The biggest challenge was ensuring the swap logic was atomic. A user accepting a swap triggers multiple database updates, which could fail halfway. This was solved by using a **PostgreSQL transaction** in the `POST /api/swap/response` endpoint.
* **Deployment Caching:** A significant challenge during deployment was a stubborn cache issue with Vite and Vercel, where outdated versions of `@chakra-ui` were being loaded. This was a development environment issue and was resolved by bypassing the main bundle and importing components from their sub-packages (e.g., `@chakra-ui/alert`). *(We later reverted this for simplicity, but it was a key challenge).*
* **Case-Sensitivity:** The Vercel (Linux) build environment is case-sensitive, while the local (Windows) environment was not. This led to build failures (e.g., `eventForm` vs. `EventForm.jsx`). This was solved by ensuring all component import paths were explicit and used the exact file name, including the `.jsx` extension.