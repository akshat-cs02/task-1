# task-1

A mini social feed app similar to the [TaskPlanet Social page](https://play.google.com/store/apps/details?id=com.taskplanet), built for the **3W Full Stack Internship** assignment.

Users can sign up / log in with email + password, create posts with text/images/polls/promotions, and interact with each other's posts via likes, comments, shares, and follows.

---

## What it does

- **Auth:** Email/password signup & login with JWT. Optional display name.
- **Posts:** Create posts with text, images (stored as base64 in MongoDB), or both.
- **Polls:** Ask a question with 2–5 options and a duration (24h / 3 days / 7 days). Others vote and see live results.
- **Promotions:** Promote a website/app with a title, description, and category (Refer and earn / Crypto). Shows in a dedicated Promotions tab.
- **Feed:** Public feed with "Load more" pagination. Sort by Most liked / Most commented / Most shared.
- **For You:** Filter to posts from people you follow.
- **Interactions:** Like (toggle), comment (real-time), share (count + clipboard copy), follow/unfollow, report (9 reason categories).
- **Responsive:** Works on desktop and mobile with a clean purple-accented UI.

---

## Tech stack

| Layer    | Tech                                  |
| -------- | ------------------------------------- |
| Frontend | React 18 + Vite + React Bootstrap    |
| Backend  | Node.js + Express 5 + Mongoose       |
| Database | MongoDB (2 collections: `users`, `posts`) |
| Auth     | JWT (7-day expiry) + bcryptjs hashing |
| Styling  | React Bootstrap + custom CSS          |

---

## How it's structured

```
task-1/
├── BackEnd/                # Express API server
│   ├── models/
│   │   ├── User.js         # User schema (username, name, email, password, following)
│   │   └── Post.js         # Post schema (text, image, poll, promotion, likes, comments, shares, reports)
│   ├── routes/
│   │   ├── auth.js         # Signup + login
│   │   ├── posts.js        # CRUD + like/comment/share/vote/report
│   │   └── users.js        # Profile + follow/unfollow
│   ├── middleware/
│   │   └── auth.js         # JWT verification middleware
│   ├── server.js           # Entry point — connects DB, mounts routes
│   └── .env.example        # Template for environment variables
│
├── FrontEnd/               # React SPA
│   └── src/
│       ├── api.js          # All API calls (grouped by resource)
│       ├── constants.js    # Shared data (emojis, promotion categories)
│       ├── context/
│       │   └── AuthContext.jsx  # Auth state + following list management
│       └── components/
│           ├── AuthPage.jsx         # Login / signup forms
│           ├── NavBar.jsx           # Top navigation bar
│           ├── FeedPage.jsx         # Main feed with toolbar, sort tabs, pagination
│           ├── PostComposer.jsx     # "What's on your mind?" + photo/emoji/poll
│           ├── PromotionComposer.jsx # Promotion form (website, title, description, category)
│           ├── PostCard.jsx         # Single post view (content, poll, actions, comments)
│           ├── PollModal.jsx        # Poll creation popup
│           └── ReportModal.jsx      # Report post popup with radio reasons
│
└── README.md               # This file
```

---

## Running this project locally

### 1. Backend

```bash
cd BackEnd
cp .env.example .env        # fill in MONGO_URI and JWT_SECRET
npm install
npm run dev                 # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd FrontEnd
npm install
npm run dev                 # starts on http://localhost:5173
```

The Vite dev server proxies `/api` requests to `localhost:5000`, so no CORS issues in development.

---

## API endpoints

| Method   | Endpoint                     | Auth | Description                                           |
| -------- | ---------------------------- | ---- | ----------------------------------------------------- |
| POST     | `/api/auth/signup`           | —    | Create account (username, name, email, password)      |
| POST     | `/api/auth/login`            | —    | Login → returns JWT token + user object               |
| GET      | `/api/users/me`              | ✔    | Current profile + following IDs                       |
| POST     | `/api/users/:id/follow`      | ✔    | Toggle follow/unfollow a user                         |
| GET      | `/api/posts`                 | ✔    | Feed (cursor pagination, `scope=following`, `type=promotion`) |
| POST     | `/api/posts`                 | ✔    | Create post (text, image, poll, and/or promotion)     |
| POST     | `/api/posts/:id/like`        | ✔    | Toggle like                                           |
| POST     | `/api/posts/:id/comment`     | ✔    | Add comment                                           |
| POST     | `/api/posts/:id/share`       | ✔    | Toggle share                                          |
| POST     | `/api/posts/:id/vote`        | ✔    | Vote on a poll (option index)                         |
| POST     | `/api/posts/:id/report`      | ✔    | Report a post (reason from 9 options)                 |

---

## Deploying

### Backend → Render (free)

1. Push `task-1/BackEnd` to your GitHub repo.
2. [Render](https://render.com) → **New → Web Service** → import repo.
3. Set **Root Directory:** `task-1/BackEnd`
4. Environment variables:
   - `MONGO_URI` — your MongoDB Atlas connection string
   - `JWT_SECRET` — a long random string
   - `CLIENT_URL` — your deployed frontend URL
5. Deploy → you get a URL like `https://your-app.onrender.com`

### Frontend → Vercel (free)

1. Push `task-1/FrontEnd` to your GitHub repo.
2. [Vercel](https://vercel.com) → import repo.
3. Framework preset: **Vite**. Root directory: `task-1/FrontEnd`.
4. Build command: `npm run build`. Output: `dist`.
5. Environment variable: `VITE_API_URL` = your Render backend URL.

### Database → MongoDB Atlas

1. Create a project → create a free **M0** cluster.
2. **Database Access:** add a user (username + password).
3. **Network Access:** allow `0.0.0.0/0` (needed for Render).
4. **Connect** → Drivers → copy the connection string into `MONGO_URI`.

---

## Built with

- [React](https://react.dev/) + [Vite](https://vite.dev/) + [React Bootstrap](https://react-bootstrap.github.io/)
- [Express](https://expressjs.com/) + [Mongoose](https://mongoosejs.com/)
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js)

---

## License

This project is built as part of the **3W Full Stack Internship — Task 1** assignment.