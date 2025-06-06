# slackoptimizer
# Smart Notifications Slack App

AI-powered Slack notification filtering application built with TypeScript and MVC architecture.

## 🏗️ Architecture

This project follows a clean MVC (Model-View-Controller) pattern:

- **Controllers**: Handle Slack events, interactions, and HTTP requests
- **Views**: Generate Block Kit UI components for Slack
- **Services**: Manage external API integrations (Slack API, Backend API)
- **Models**: Define shared interfaces and types
- **Components**: Reusable Block Kit building blocks

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Slack workspace with admin permissions

### Installation

1. Clone and setup:
```bash
git clone <repo-url>
cd slack-smart-notifications
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your Slack app credentials
```

3. Start development server:
```bash
npm run dev
```

## 📁 Project Structure

```
src/
├── controllers/     # Slack event & interaction handlers
├── views/          # Block Kit UI components  
├── services/       # External API integrations
├── models/         # Shared interfaces & types
├── components/     # Reusable Block Kit blocks
├── middleware/     # Express & Slack middleware
├── routes/         # Express route definitions
├── types/          # TypeScript type definitions
├── utils/          # Helper functions
├── config/         # App configuration
└── app.ts          # Main application entry point
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Check TypeScript types

### Phase 1.1 Checklist

- [x] TypeScript configuration with ESNext + bundler
- [x] MVC folder structure created
- [x] Shared type definitions with backend contract
- [x] Base controller, view, and service classes
- [x] Configuration management (Slack, Backend, App)
- [x] Main application setup with Express + Bolt
- [x] Development tooling (scripts, linting, formatting)

## 🔑 Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Required |
|----------|-------------|----------|
| `SLACK_CLIENT_ID` | Slack app client ID | Yes |
| `SLACK_CLIENT_SECRET` | Slack app client secret | Yes |
| `SLACK_SIGNING_SECRET` | Slack app signing secret | Yes |
| `SLACK_BOT_TOKEN` | Bot user OAuth token | Yes |
| `BACKEND_API_URL` | Backend API base URL | Yes |
| `BACKEND_API_KEY` | Backend API authentication key | Yes |

## 🤝 Team Coordination

### Frontend Responsibilities (You)
- Slack UI with Block Kit
- Slack API integrations (OAuth, events, Web API)
- HTTP client for backend API
- User experience and interface design

### Backend Responsibilities (Cofounder)
- AI/ML message classification
- Database schemas and persistence
- Analytics and data processing
- API endpoints for frontend consumption

### Shared
- Type definitions in `src/types/` and `src/models/interfaces/`
- API contracts and request/response formats
- Testing strategies and integration points

## 📋 Next Steps

**Phase 1.2: Basic Controllers & Services**
- Implement SlackEventController for message events
- Create SlackAPIService for Web API calls
- Build BackendAPIService for classification requests
- Add basic error handling and logging

**Phase 1.3: OAuth & Installation Flow**
- SlackOAuthController for app installation
- AuthService for token management
- Installation storage integration

Ready to move to Phase 1.2! 🎯