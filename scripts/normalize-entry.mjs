import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const htmlPath = path.join(root, 'index.html')

if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8')
  const updated = html.replace('/src/main.jsx', '/main.jsx')
  if (updated !== html) {
    fs.writeFileSync(htmlPath, updated)
    console.log('Normalized index.html entry to /main.jsx')
  }
}

const srcDir = path.join(root, 'src')
const srcMain = path.join(srcDir, 'main.jsx')
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true })
}
if (!fs.existsSync(srcMain)) {
  fs.writeFileSync(srcMain, "import '../main.jsx'\n")
  console.log('Created src/main.jsx compatibility shim')
}
