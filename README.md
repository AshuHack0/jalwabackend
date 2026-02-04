# Jalwa Backend

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed on your system.

### Installation

```bash
bun install
```

### Configuration

Create a `.env` file in the root directory and configure the following variables:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/jalwa
```

### Running the Server

**Development mode (with hot reload):**
```bash
bun run dev
```

**Production mode:**
```bash
bun run start
```

## 📁 Project Structure

```text
jalwabackend/
├── src/
│   ├── config/          # Database and environment configurations
│   ├── controllers/     # Request handles (logic)
│   ├── dal/             # Data Access Layer
│   ├── middleware/      # Custom Express middleware
│   ├── routes/          # API route definitions
│   ├── utils/           # Shared utility functions
│   └── index.js         # Entry point
├── .env.example         # Example environment variables
├── package.json         # Project manifests and scripts
└── README.md            # Project documentation
```

## 🔌 API Endpoints

- `GET /` - API Welcome & Version
- `GET /api/v1/` - Welcome to V1 API

---

Developed with ❤️ for the Jalwa platform.
