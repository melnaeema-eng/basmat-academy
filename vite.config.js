import { defineConfig } from 'vite'
import {execFileSync} from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    {name:'academy-build-identity',generateBundle(){
      let commit=process.env.CF_PAGES_COMMIT_SHA||process.env.GITHUB_SHA||'unknown';
      if(commit==='unknown'){try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()}catch{}}
      this.emitFile({type:'asset',fileName:'build-info.json',source:JSON.stringify({application:'basmat-academy',release:'weighted-lab-lessons-v2',commit,built_at:new Date().toISOString()})});
    }},
    react(),
    tailwindcss(),
  ],
})