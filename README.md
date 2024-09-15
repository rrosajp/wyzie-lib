# Wyzie Lib
Wyzie Lib is a package made for easily implementing [Wyzie Subs](https://subs.wyzie.ru) into your project without all the fuss.

## Features
- **Simple**: Just one function for searching subtitles using Wyzie Subs API.
- **Fast**: This package was written in Vite with TypeScript, so it's fast and reliable.
- **Open-Source**: The API and package are open-source.
  
## Installation
### NPM
```bash
npm install wyzie-lib
```
### PNPM
```bash
pnpm install wyzie-lib
```

## Usage
```ts
import { type SubtitleData, searchSubtitles } from 'wyzie-lib';

const data: SubtitleData[] = await Search({ tmdb_id: 286217, language: "en" });
console.log(data[0].id);
```

<sup>
  Created by <a href="https://github.com/itzcozi" alt="github" title="itzCozi on Github">BadDeveloper</a> with 💙
</sup>