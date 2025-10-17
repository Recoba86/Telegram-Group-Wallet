# Contributing to Telegram Wallet Bot

Thank you for your interest in contributing! Here are some guidelines:

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/telegram-group-wallet.git`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and configure
5. Run migrations: `npm run migrate`
6. Start dev server: `npm run dev`

## Code Style

- Use TypeScript for all new code
- Follow existing code style (ESLint configuration)
- Add JSDoc comments for public functions
- Write tests for new features

## Commit Messages

Use conventional commits format:
- `feat: add new feature`
- `fix: fix bug`
- `docs: update documentation`
- `test: add tests`
- `refactor: refactor code`

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run tests: `npm test`
4. Lint code: `npm run lint`
5. Commit changes with clear messages
6. Push to your fork
7. Create a Pull Request

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for >80% code coverage

## Database Changes

- Create a new migration for schema changes: `npm run migrate:make your_migration`
- Test migrations both up and down
- Document any data migrations needed

## Security

- Never commit sensitive data (.env, tokens, keys)
- Report security issues privately to maintainers
- Follow security best practices

## Questions?

Open an issue or reach out to maintainers.

Thank you for contributing! 🙏
