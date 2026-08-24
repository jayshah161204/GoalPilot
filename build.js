const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('--- GoalPilot Universal Build Script ---')
console.log('Current working directory:', process.cwd())

// Case 1: Running from repo root (frontend/ exists)
if (fs.existsSync(path.join(process.cwd(), 'frontend', 'package.json'))) {
  console.log('Detected repository root. Building frontend from ./frontend...')
  execSync('npm --prefix frontend install', { stdio: 'inherit' })
  execSync('npm --prefix frontend run build', { stdio: 'inherit' })

  // Ensure dist is available at both ./dist and ./frontend/dist
  const srcDist = path.join(process.cwd(), 'frontend', 'dist')
  const destDist = path.join(process.cwd(), 'dist')
  if (fs.existsSync(srcDist)) {
    if (fs.existsSync(destDist)) {
      fs.rmSync(destDist, { recursive: true, force: true })
    }
    fs.cpSync(srcDist, destDist, { recursive: true })
    console.log('Copied build output to ./dist and ./frontend/dist')
  }
}
// Case 2: Running from inside frontend/ directory
else if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
  console.log('Detected frontend directory. Running vite build...')
  execSync('npm run build', { stdio: 'inherit' })
} else {
  console.error('Could not locate package.json for build.')
  process.exit(1)
}

console.log('✓ GoalPilot build completed successfully.')
