import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import chalk from 'chalk'
import fs from 'fs'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone'
import NodeCache from 'node-cache'

const pkg = JSON.parse(await fs.promises.readFile(new URL('./package.json', import.meta.url), 'utf-8'))
const moduleCache = new NodeCache({ stdTTL: 300 });

function normalizeOwnerList(list) {
  return list.map(entry => [
    entry[0], 
    entry[1],
    entry[2]
  ]);
}

global.browserless = "obeyra"

global.endy = ['393501989497']

let ownerData = [
  ['393501989497', 'Endy', true],
  ['393505723612', 'deni', true],
  ['14153907884', 'knor', true],   
  ['393513766377', 'roby', true],
  ['79524931364', 'punisher', true],     

// ---- Owner LID ----

  ['393501989497', 'Endy', true],

];

if (fs.existsSync('./owner.json')) {
  try {
    const fromFile = JSON.parse(fs.readFileSync('./owner.json', 'utf-8'));
    if (Array.isArray(fromFile) && fromFile.length) {

      const merged = [...ownerData]
for (const entry of fromFile) {
  const id = String(entry?.[0] ?? '');
  if (id && !merged.some(e => String(e?.[0] ?? '') === id)) {
    merged.push(entry);
  }
}
      ownerData = merged;
    }
  } catch (e) {
    console.error("Errore nella lettura di owner.json:", e);
  }
} else {
  fs.writeFileSync('./owner.json', JSON.stringify(ownerData, null, 2));
}

global.owner = normalizeOwnerList(ownerData)


global.nomepack = 'obeyra bot'
global.nomebot = 'obeyra bot'
global.wm = 'obeyra bot'
global.autore = 'Endy'
global.dev = 'Endy'
global.testobot = `obeyra bot`
global.versione = pkg.version
global.errore = '⚠️ *Errore inatteso!* Usa il comando `.segnala` per avvisare gli owner.'

global.repobot = 'https//wa.me/39501989497'
global.canale = 'https://whatsapp.com/channel/0029VbEKwNeL2ATx78GmKL2r'
global.gruppo = 'https://chat.whatsapp.com/DofpUEqCeuO6u4csydLwaA?s=cl&p=a&mlu=4&ilr=4&iam=2'

global.cheerio = cheerio
global.fs = fs
global.fetch = fetch
global.axios = axios
global.moment = moment

global.APIKeys = { 
    spotifyclientid: '888',
    spotifysecret: '888',
    screenshotone: '888',
    screenshotone_default: '888',
    tmdb: '888',
    gemini:'AQ.Ab8RN6Jg9lmcMeIuoneNkCzBeS0sSc39BOaoRLPXjTKX45VTDQ',
    ocrspace: '888',
    assemblyai: '888',
    google: '888',
    googlex: '888',
    googleCX: '888',
    genius: '888',
    unsplash: '888',
    removebg: 'FEx4CYmYN1QRQWD1mbZp87jV',
    openrouter: '888',
    groq: '888',
    lastfm: '36f859a1fc4121e7f0e931806507d5f9',
}

let filePath = fileURLToPath(import.meta.url)
let fileUrl = pathToFileURL(filePath).href

const reloadConfig = async () => {
  const cached = moduleCache.get(fileUrl);
  if (cached) return cached;
  unwatchFile(filePath)
  console.log(chalk.bgHex('#ff0000')(chalk.white.bold("File: 'config.js' Aggiornato")))
  const module = await import(`${fileUrl}?update=${Date.now()}`)
  moduleCache.set(fileUrl, module, { ttl: 300 });
  return module;
}

watchFile(filePath, reloadConfig)
