# Jalwa Backend

A modern backend API built with Bun and Elysia.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed on your system

### Installation

```bash
bun install
```

### Running the Server

Development mode (with hot reload):
```bash
bun run dev
```

Production mode:
```bash
bun run start
```

### Project Structure

```
jalwabackend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Custom middleware
│   ├── routes/          # Route definitions
│   ├── utils/           # Utility functions
│   └── index.js         # Entry point
├── .env.example         # Example environment variables
├── package.json
└── README.md
```

### API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check endpoint
- `GET /api/example` - Example GET endpoint
- `POST /api/example` - Example POST endpoint

## Development

The server runs on `http://localhost:3000` by default (configurable via `PORT` environment variable).
