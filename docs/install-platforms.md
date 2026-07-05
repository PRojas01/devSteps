# Install and Use by Platform

Esta guía cubre la instalación mínima para usar `SP-devSteps` en Windows y Linux. Los comandos asumen Node.js 20 o superior y Git instalados.

## Windows

### 1. Instala prerrequisitos

- Node.js 20 o superior desde <https://nodejs.org>
- Git for Windows desde <https://git-scm.com/download/win>
- PowerShell, Windows Terminal o la terminal integrada de tu editor

Verifica:

```powershell
node --version
npm --version
git --version
```

### 2. Instala devSteps

```powershell
npm install -g sp-devsteps
devsteps --help
```

Si PowerShell no encuentra el comando, cierra y abre la terminal. También puedes probar:

```powershell
sp-devsteps --help
```

### 3. Crea un proyecto

```powershell
mkdir mi-primer-proyecto
cd mi-primer-proyecto
devsteps scaffold --name "Mi Primer Proyecto" --type web-app --stack typescript,node --force
devsteps validate
```

### 4. Verifica el proyecto generado

```powershell
npm install
npm run build
npm test
```

### 5. Usa DevControl si vas a trabajar con agentes

```powershell
git init
sp-devcontrol init
sp-devcontrol inject
sp-devcontrol project:check
```

## Linux

### 1. Instala prerrequisitos

Instala Node.js 20 o superior con tu gestor preferido (`nvm`, `fnm`, NodeSource o el gestor de tu distribución) y Git.

Verifica:

```bash
node --version
npm --version
git --version
```

### 2. Instala devSteps

```bash
npm install -g sp-devsteps
devsteps --help
```

Si `npm install -g` requiere permisos de administrador, usa un gestor como `nvm`/`fnm` o configura el directorio global de npm para tu usuario.

### 3. Crea un proyecto

```bash
mkdir mi-primer-proyecto
cd mi-primer-proyecto
devsteps scaffold --name "Mi Primer Proyecto" --type web-app --stack typescript,node --force
devsteps validate
```

### 4. Verifica el proyecto generado

```bash
npm install
npm run build
npm test
```

### 5. Usa DevControl si vas a trabajar con agentes

```bash
git init
sp-devcontrol init
sp-devcontrol inject
sp-devcontrol project:check
```

## Uso diario

```bash
devsteps guide
devsteps inject
devsteps validate
devsteps run
```

## Problemas comunes

- `devsteps: command not found`: reinstala con `npm install -g sp-devsteps`, abre una terminal nueva y verifica `npm bin -g`.
- `sp-devcontrol inject` falla por configuración faltante: ejecuta primero `git init` y `sp-devcontrol init`.
- `npm install` falla por permisos en Linux: evita `sudo npm install -g`; usa `nvm`, `fnm` o configura npm para tu usuario.
