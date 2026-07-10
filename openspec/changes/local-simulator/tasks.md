## 1. Infrastructure Layer Setup (Terminal & Memory Repository)

- [x] 1.1 Create Terminal service interface and console implementation wrapping Node.js Readline (src/presentation/console/terminal.ts)
- [x] 1.2 Create GameRepository service interface and InMemoryRepository implementation using an in-memory Map (src/persistence/memory/repository.ts)

## 2. Presentation Layer Setup (ConsolePresenter)

- [x] 2.1 Implement ConsolePresenter interface with robust ASCII art layout rendering for side-by-side player board comparison (src/presentation/console/presenter.ts)
- [x] 2.2 Add dice unicode face helper mapping numbers 1-6 to unicode dice blocks (⚀-⚅) (src/presentation/console/dice-helper.ts)

## 3. Orchestration & Game Loop (CliGameRunner)

- [x] 3.1 Implement CliGameRunner module with game mode and player name initialization inputs (src/presentation/console/runner.ts)
- [x] 3.2 Implement roll phase CLI loop allowing users to input indices to hold and triggering rollDice (src/presentation/console/runner.ts)
- [x] 3.3 Implement category selection CLI loop validating category availability and triggering selectCategory (src/presentation/console/runner.ts)
- [x] 3.4 Implement main orchestrator combining DI layers and game termination check (src/presentation/console/runner.ts)

## 4. Entrypoint and Package Scripts

- [x] 4.1 Create run script entrypoint for local simulation (src/presentation/console/index.ts)
- [x] 4.2 Add npm script "simulate" to package.json pointing to the CLI entrypoint

## 5. Additional Features

- [x] 5.1 Render expected scores for available categories during selection prompt using domain calculateScore helper

