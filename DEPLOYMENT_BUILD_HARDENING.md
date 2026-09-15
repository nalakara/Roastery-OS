# DEPLOYMENT BUILD HARDENING

## 1. Vercel Failure Summary

During deployment of commit `c5a7010`, the Vercel build pipeline executed `npm run build` from the repository root, triggering:
```text
> roastery-os@0.1.0 build
> npm run build --workspaces
```
This failed across multiple packages with errors of the form:
```text
../domain-core/src/__tests__/domain-core.test.ts(13,60): error TS2307: Cannot find module '@roastery-os/contracts' or its corresponding type declarations.
../domain-core/src/decimal-value.ts(2,38): error TS2307: Cannot find module '@roastery-os/contracts' or its corresponding type declarations.
```

## 2. First Meaningful Error
The root compilation failure was:
```text
error TS2307: Cannot find module '@roastery-os/contracts' or its corresponding type declarations.
```
occurring during the clean compilation of `@roastery-os/domain-core` and `@roastery-os/app-api`.

## 3. Root Cause Analysis

There were two concurrent root causes in clean monorepo builds:

1. **Non-Deterministic Workspace Execution Order in `npm run build --workspaces`**:
   `npm run build --workspaces` executes workspace scripts based on workspace declaration or alphabetical directory order rather than topologically sorting TypeScript project reference graphs. On a completely clean environment where `packages/*/dist` is not yet populated, packages that import sibling packages (e.g. `domain-core` importing `@roastery-os/contracts`) fail because the sibling's declaration/dist files (`./dist/index.d.ts`) have not been emitted yet.

2. **Incomplete Project References in Leaf / Downstream Tsconfigs**:
   `packages/app-api/tsconfig.json` initially only referenced `../contracts` and `../application-services`, omitting `../domain-core` and `../infrastructure-postgres`. When `tsc -b` attempted to build `app-api` and traverse its dependency graph, it could not resolve types from the unreferenced sibling projects.

## 4. Why Local Development Hid the Problem

During local development, developers frequently run tests or develop incrementally where `packages/contracts/dist`, `packages/domain-core/dist`, etc., were already generated and persisted on disk from previous builds. Because the `.d.ts` artifacts already existed, subsequent partial compiles succeeded, masking the fact that a clean-room `npm install && npm run build` on CI/Vercel starts with zero pre-existing artifacts.

## 5. Dependency & Project Build Graph

The correct topological compilation graph for Roastery OS is:

```
@roastery-os/contracts (Root leaf: zero workspace dependencies)
       │
       ▼
@roastery-os/domain-core (Depends on contracts)
       │
       ▼
@roastery-os/infrastructure-postgres (Depends on contracts, domain-core)
       │
       ▼
@roastery-os/application-services (Depends on contracts, domain-core, infrastructure-postgres)
       │
       ▼
@roastery-os/app-api (Depends on contracts, domain-core, infrastructure-postgres, application-services)
```

## 6. Exact Fix Applied

1. **Root Build Orchestration via Project References**:
   Updated root `package.json` script:
   - Changed `"build": "npm run build --workspaces"`
   - To: `"build": "tsc -b tsconfig.json"`
   This utilizes TypeScript's native composite project builder, which analyzes all referenced project graphs in root `tsconfig.json` and compiles them in strict topological order.

2. **Complete Project References in Tsconfigs**:
   - `packages/contracts/tsconfig.json`: root reference.
   - `packages/domain-core/tsconfig.json`: references `../contracts`.
   - `packages/infrastructure-postgres/tsconfig.json`: references `../contracts`, `../domain-core`.
   - `packages/application-services/tsconfig.json`: references `../contracts`, `../domain-core`, `../infrastructure-postgres`.
   - `packages/app-api/tsconfig.json`: references `../contracts`, `../domain-core`, `../infrastructure-postgres`, `../application-services`.

3. **Preserved Package-Level Builds**:
   - Each package retains its individual `"build": "tsc -b"` script in its `package.json` so individual packages can be built or verified independently.

## 7. Clean-Room Verification Results

1. **Clean Slate Execution**:
   ```bash
   npm run clean --workspaces
   find packages -name "dist" -o -name "*.tsbuildinfo"  # Verified 0 outputs
   ```

2. **Clean Build Execution**:
   ```bash
   npm run build
   ```
   **Result**: Succeeded with code 0 (`tsc -b tsconfig.json`).
   
3. **Artifact Verification**:
   - `packages/contracts/dist` (exists, contains `index.js`, `index.d.ts`, `index.d.ts.map`)
   - `packages/domain-core/dist` (exists)
   - `packages/infrastructure-postgres/dist` (exists)
   - `packages/application-services/dist` (exists)
   - `packages/app-api/dist` (exists)

## 8. Test Results

Executed complete workspace test suite:
```bash
npm test
```
**Results**:
- **Total Tests**: 119 passing, 0 failing across all 5 workspace packages:
  - `@roastery-os/contracts`: PASS
  - `@roastery-os/domain-core`: 12/12 PASS
  - `@roastery-os/infrastructure-postgres`: PASS
  - `@roastery-os/application-services`: 37/37 PASS
  - `@roastery-os/app-api`: 70/70 PASS

## 9. Vercel Deployment Readiness

- When Vercel clones the repo at root and executes `npm run build`, it executes `tsc -b tsconfig.json`.
- TypeScript builds `@roastery-os/contracts` first, followed by `domain-core`, `infrastructure-postgres`, `application-services`, and finally `app-api` deterministically.
- All static assets are served from `packages/app-api/public`, and the node server starts from `packages/app-api/dist/index.js`.
