# devSteps Agent Guide — TestRun

> Auto-generated. Do not edit manually. Run `devsteps inject` to regenerate.

## Project
{
  "name": "TestRun",
  "type": "web-app",
  "stack": [
    "typescript node"
  ],
  "standard": "ds-v1"
}

## Active Pipeline
[
  {
    "id": "1-validate-idea",
    "name": "Validar Idea",
    "systems": [
      "opencode",
      "claude",
      "codex"
    ],
    "approve": "human",
    "output": [
      "decision.md",
      "research.md",
      "analysis.md"
    ]
  },
  {
    "id": "2-design",
    "name": "Diseñar",
    "systems": [
      "opencode"
    ],
    "approve": "human",
    "output": [
      "docs/requirements.md",
      "docs/architecture.md",
      "docs/adr-*.md"
    ]
  },
  {
    "id": "3-init",
    "name": "Inicializar",
    "systems": [
      "opencode"
    ],
    "approve": "human",
    "output": [
      "package.json",
      "tsconfig.json",
      "src/",
      "tests/"
    ]
  },
  {
    "id": "4-develop",
    "name": "Desarrollar",
    "systems": [
      "opencode"
    ],
    "approve": "human",
    "output": [
      "src/**/*",
      "tests/**/*"
    ]
  },
  {
    "id": "5-verify",
    "name": "Verificar",
    "systems": [
      "auto",
      "opencode"
    ],
    "approve": "human",
    "output": [
      "test-report.md"
    ]
  },
  {
    "id": "5.5-review",
    "name": "Revisar",
    "systems": [
      "opencode"
    ],
    "approve": "human",
    "output": [
      "review-report.md"
    ]
  },
  {
    "id": "6-release",
    "name": "Release",
    "systems": [
      "auto",
      "human"
    ],
    "approve": "human",
    "output": [
      "CHANGELOG.md",
      "dist/",
      "git-tag"
    ]
  },
  {
    "id": "7-maintain",
    "name": "Mantener",
    "systems": [
      "opencode"
    ],
    "approve": "human",
    "output": []
  }
]

## Standard (DS-v1)
[
  {
    "id": "DS-001",
    "name": "README required",
    "severity": "error",
    "scope": [
      "README.md"
    ]
  },
  {
    "id": "DS-002",
    "name": "Module purpose comment",
    "severity": "warning",
    "scope": [
      "src/**/*.ts"
    ]
  },
  {
    "id": "DS-003",
    "name": "Requirements doc",
    "severity": "error",
    "scope": [
      "docs/requirements.md"
    ]
  },
  {
    "id": "DS-004",
    "name": "Architecture doc",
    "severity": "error",
    "scope": [
      "docs/architecture.md"
    ]
  },
  {
    "id": "DS-005",
    "name": "ADR required for decisions",
    "severity": "warning",
    "scope": [
      "docs/adr-*.md"
    ]
  },
  {
    "id": "DS-010",
    "name": "No secrets in code",
    "severity": "error",
    "scope": [
      "src/**/*.ts",
      "src/**/*.js",
      "config/**/*"
    ]
  },
  {
    "id": "DS-011",
    "name": "SQL injection prevention",
    "severity": "error",
    "scope": [
      "src/**/*.ts",
      "src/**/*.js"
    ]
  },
  {
    "id": "DS-012",
    "name": "No innerHTML without sanitization",
    "severity": "error",
    "scope": [
      "src/**/*.tsx",
      "src/**/*.ts"
    ]
  },
  {
    "id": "DS-013",
    "name": "Command injection prevention",
    "severity": "error",
    "scope": [
      "src/**/*.ts",
      "src/**/*.js"
    ]
  },
  {
    "id": "DS-020",
    "name": "Layer separation",
    "severity": "warning",
    "scope": [
      "src/**/*.ts"
    ]
  },
  {
    "id": "DS-021",
    "name": "Consistent naming",
    "severity": "warning",
    "scope": [
      "src/**/*.ts"
    ]
  },
  {
    "id": "DS-022",
    "name": "Single responsibility",
    "severity": "warning",
    "scope": [
      "src/**/*.ts"
    ]
  },
  {
    "id": "DS-030",
    "name": "Strict TypeScript",
    "severity": "error",
    "scope": [
      "tsconfig.json"
    ]
  },
  {
    "id": "DS-031",
    "name": "No console.log in production",
    "severity": "warning",
    "scope": [
      "src/**/*.ts",
      "src/**/*.tsx"
    ]
  },
  {
    "id": "DS-032",
    "name": "File length limit",
    "severity": "warning",
    "scope": [
      "src/**/*.ts",
      "src/**/*.tsx"
    ]
  },
  {
    "id": "DS-050",
    "name": "Tests required for source",
    "severity": "error",
    "scope": [
      "src/**/*.ts",
      "src/**/*.tsx"
    ]
  },
  {
    "id": "DS-051",
    "name": "No any types",
    "severity": "warning",
    "scope": [
      "src/**/*.ts",
      "src/**/*.tsx"
    ]
  },
  {
    "id": "DS-070",
    "name": "Conventional Commits",
    "severity": "error",
    "scope": []
  },
  {
    "id": "DS-071",
    "name": ".gitignore present",
    "severity": "error",
    "scope": [
      ".gitignore"
    ]
  },
  {
    "id": "DS-072",
    "name": "License file",
    "severity": "warning",
    "scope": [
      "LICENSE"
    ]
  },
  {
    "id": "DS-080",
    "name": "CHANGELOG required",
    "severity": "warning",
    "scope": [
      "CHANGELOG.md"
    ]
  },
  {
    "id": "DS-081",
    "name": "SemVer versioning",
    "severity": "error",
    "scope": [
      "package.json"
    ]
  },
  {
    "id": "DS-090",
    "name": "package.json present",
    "severity": "error",
    "scope": [
      "package.json"
    ]
  },
  {
    "id": "DS-091",
    "name": "tsconfig.json present",
    "severity": "error",
    "scope": [
      "tsconfig.json"
    ]
  }
]

## Commands
- `devsteps status` — Current step
- `devsteps run` — Execute pipeline
- `devsteps step:complete <id>` — Complete step
- `devsteps validate` — Check quality
- `devsteps doctor` — Diagnose environment
