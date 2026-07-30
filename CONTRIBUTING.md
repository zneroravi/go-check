# Contributing

Thank you for your interest in contributing to this project!

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in required values
4. Run the development server: `npm run dev`

## Running Tests

- Run all tests: `npm test`
- Run tests in watch mode: `npx vitest`
- Run tests with coverage: `npx vitest run --coverage`

## Code Style

- This project uses TypeScript with strict mode enabled
- Use 2-space indentation
- Follow existing naming conventions (camelCase for variables, PascalCase for classes)
- Write meaningful commit messages
- Ensure all tests pass before submitting a PR
- Update documentation when adding or changing features

## Pull Request Guidelines

1. Create a feature branch from `main`
2. Make your changes and ensure tests pass
3. Update the CHANGELOG.md with your changes under the "Unreleased" section
4. Open a pull request with a clear description of the changes
5. Link any related issues in the PR description
6. Request review from the CODEOWNERS
