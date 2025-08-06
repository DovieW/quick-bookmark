## Build

- **build**: `npm run build` – builds the extension.

## Code Style
- **Imports**: absolute imports from `src/`, use `{}` for named imports, default export for components.
- **Formatting**: Prettier with default config; run `npm run format` (add script if missing).
- **Types**: Use `interface` for props, avoid `any`.
- **Naming**: PascalCase for components, camelCase for functions/variables, UPPER_SNAKE for constants.
- **Error handling**: Throw `Error` with descriptive message; use `try/catch` with async/await.
- **JSX**: Self‑close void elements, use `className`.
- **React**: Functional components, hooks for state.
- **TS**: Strict mode enabled, no `any`.
- **Lint**: `npm run lint` (add script `"lint": "eslint . --ext .ts,.tsx"`).

## Project Structure
```
src/
  components/   # UI components
  popup/       # popup entry point
  background.ts
  open.tsx
```

## .crush Directory
Add `.crush/` to `.gitignore` (already added).
