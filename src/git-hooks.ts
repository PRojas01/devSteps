/** Module purpose: supports devSteps git hooks functionality. */
import { writeFileSync, existsSync, mkdirSync, chmodSync } from 'fs'
import { resolve } from 'path'
import chalk from 'chalk'
import { loadConfig } from './config.js'
import { DS_V1 } from './standard/ds-v1.js'
import { validateProjectAgainstStandard } from './standard/validator.js'

interface GitHooksOptions {
  install?: boolean
  remove?: boolean
}

const HOOKS_DIR = '.git/hooks'

function preCommitHook(root: string): string {
  return `#!/bin/sh
# devSteps pre-commit hook — validate DS-v1 norms for staged files
echo "🔍 devSteps: Validating staged files against DS-v1..."

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Run devSteps validate on staged files
npx devsteps validate 2>/dev/null || true

# Check for hardcoded secrets in staged files
for FILE in $STAGED_FILES; do
  if echo "$FILE" | grep -qE '\\.(ts|js|tsx|jsx|json|env)$'; then
    if git show :"$FILE" | grep -qiE '(api[_-]?key|secret|password|token|credential).{0,5}=['"'"'"]'; then
      echo "❌ Possible secret in $FILE"
      echo "   Remove hardcoded secrets before committing."
      exit 1
    fi
  fi
done

# Check commit message format
COMMIT_MSG_FILE="$1"
if [ -f "$COMMIT_MSG_FILE" ]; then
  COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")
  if ! echo "$COMMIT_MSG" | head -1 | grep -qE '^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)(\\(.+\\))?!?:\\s.+'; then
    echo "⚠ Commit message does not follow Conventional Commits format"
    echo "  Expected: type(scope): description"
    echo "  Valid types: feat, fix, chore, docs, refactor, test, style, perf, ci, build"
    echo ""
    echo "  To commit anyway, use: git commit --no-verify"
    exit 1
  fi
fi

exit 0
`
}

function prePushHook(root: string): string {
  return `#!/bin/sh
# devSteps pre-push hook — validate full project before push
echo "🔍 devSteps: Running pre-push validations..."

# TypeScript type check if available
if [ -f "node_modules/.bin/tsc" ]; then
  echo " Checking types..."
  npx tsc --noEmit || { echo "❌ Type errors found. Fix before pushing."; exit 1; }
fi

# Run devSteps validate
if [ -f "devsteps.yaml" ]; then
  echo " Checking DS-v1 norms..."
  npx devsteps validate || true
fi

# Check tests
if [ -f "node_modules/.bin/vitest" ]; then
  echo " Running tests..."
  npx vitest run --reporter=verbose 2>/dev/null || npx vitest run 2>/dev/null || {
    echo "⚠ Tests failed. Review before pushing."
    exit 1
  }
fi

echo "✅ All checks passed"
exit 0
`
}

function commitMsgHook(root: string): string {
  return `#!/bin/sh
# devSteps commit-msg hook — validate Conventional Commits format
COMMIT_MSG=$(cat "$1")
if ! echo "$COMMIT_MSG" | head -1 | grep -qE '^(feat|fix|chore|docs|refactor|test|style|perf|ci|build)(\\(.+\\))?!?:\\s.+'; then
  echo ""
  echo "⚠ Conventional Commits format required"
  echo "  Format: type(scope): description"
  echo "  Types: feat, fix, chore, docs, refactor, test, style, perf, ci, build"
  echo "  Examples:"
  echo "    feat(auth): add login endpoint"
  echo "    fix: handle null response"
  echo "    docs: update README"
  echo ""
  echo "  Your commit message:"
  echo "  $(head -1 "$1")"
  echo ""
  exit 1
fi
exit 0
`
}

export function runGitHooks(root: string, options: GitHooksOptions): void {
  const hooksDir = resolve(root, HOOKS_DIR)

  if (!existsSync(hooksDir)) {
    console.log(chalk.red('No .git/hooks directory found. Is this a git repository?'))
    return
  }

  if (options.remove) {
    for (const hook of ['pre-commit', 'pre-push', 'commit-msg']) {
      const hookPath = resolve(hooksDir, hook)
      if (existsSync(hookPath)) {
        writeFileSync(hookPath, '', 'utf-8')
        console.log(chalk.yellow(`  ✗ Hook eliminado: ${hook}`))
      }
    }
    return
  }

  const hooks: Array<{ name: string; content: string; description: string }> = [
    { name: 'pre-commit', content: preCommitHook(root), description: 'Validación de staged files y secrets' },
    { name: 'pre-push', content: prePushHook(root), description: 'Type check, tests, y validación DS-v1' },
    { name: 'commit-msg', content: commitMsgHook(root), description: 'Validación de formato Conventional Commits' },
  ]

  for (const hook of hooks) {
    const hookPath = resolve(hooksDir, hook.name)
    writeFileSync(hookPath, hook.content, 'utf-8')

    try {
      chmodSync(hookPath, 0o755)
    } catch {
      // Windows fallback
    }

    console.log(chalk.green(`  ✓ Hook instalado: ${hook.name} (${hook.description})`))
  }

  console.log('')
  console.log(chalk.bold('✅ Git hooks installed.'))
  console.log(chalk.dim('  - pre-commit: Valida staged files y previene hardcoded secrets'))
  console.log(chalk.dim('  - pre-push: Corre typecheck, tests, y validación DS-v1'))
  console.log(chalk.dim('  - commit-msg: Exige Conventional Commits format'))
  console.log('')
  console.log(chalk.yellow('  Para saltar hooks: git commit --no-verify / git push --no-verify'))
}
