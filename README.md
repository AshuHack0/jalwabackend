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

## 🎰 WinGo Game Rules

### Bet Types
- **BIG_SMALL** - Bet on whether result is Big (5–9) or Small (0–4)
- **NUMBER** - Bet on exact digit (0–9)
- **COLOR** - Bet on Green, Red, or Violet

### Number → Color Mapping
| Digit | Color |
|-------|-------|
| 0 | Red + Violet |
| 1, 3, 7, 9 | Green |
| 2, 4, 6, 8 | Red |
| 5 | Green + Violet |

### Payouts (on contract amount = bet × 0.98)
- **Green**: 1,3,7,9 → 2x; 5 → 1.5x
- **Red**: 2,4,6,8 → 2x; 0 → 1.5x
- **Violet**: 0 or 5 → 4.5x
- **Number** (exact): 9x
- **Big/Small**: 2x

### Requirements
- Min deposit for prediction: ₹2000
- Service fee: 2% of bet amount

---

Developed with ❤️ for the Jalwa platform.
