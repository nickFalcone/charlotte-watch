# charlotte-monitor
what's going on, charlotte?

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup
```bash
npm install
```

### Development Scripts
```bash
# Start development server
npm run dev

# Start development server with Netlify functions (for AI summaries)
netlify dev

# Build for production
npm run build

# Preview production build
npm run preview

# Quality checks (recommended before committing)
npm run check:fix    # Format + lint with auto-fix + type-check
npm run check        # Format + lint + type-check (read-only)

# Individual commands
npm run type-check   # Type checking
npm run lint         # Linting
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code
npm run format:check # Check code formatting
```

### Development Workflow

**Quick start (no AI features):**
1. `npm install`
2. `npm run dev`
3. Open http://localhost:5173

**Full development (with AI summaries):**
1. `npm install`
2. Copy `.env.example` to `.env.local` and add API keys (see below)
3. `netlify dev` (or `npm run dev` for basic features)
4. Open http://localhost:8888

**Before committing:**
```bash
npm run check:fix    # Auto-format, lint, and type-check
```

### Environment Variables

For local development with AI alert summaries, create `.env.local`:

```bash
# OpenAI API (for AI alert summaries)
# Get your key from https://platform.openai.com/
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here

# Alternative: Anthropic API
# AI_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-your-key-here

# Other optional APIs (see .env.example for full list)
```

**Note:** AI summarization only works with `netlify dev` or in production. Regular `npm run dev` will show alerts without AI summaries.

**Full development guide:** See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)

### Code Quality
This project uses:
- **ESLint** for JavaScript/TypeScript linting
- **Prettier** for code formatting
- **TypeScript** for type checking

### VS Code Setup
The project includes VS Code settings and recommended extensions:
- Auto-format on save
- ESLint auto-fix on save
- Recommended extensions for React/TypeScript development

## Project Structure
```
src/
├── components/
│   ├── widgets/          # Dashboard widgets
│   └── Widget/           # Widget wrapper components
├── types/                # TypeScript type definitions
├── utils/                # Utility functions and API clients
└── stores/               # State management
```
