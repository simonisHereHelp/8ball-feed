# Market News Tracker (Next.js)

A Next.js API app that aggregates:

-   📈 Finnhub company news (`/api/fnn-feed`)
-   🏥 FDA + healthcare RSS feeds (`/api/fda-feed`)
-   🧠 Optional Claude summarization

------------------------------------------------------------------------

## 🚀 Setup

### 1. Install dependencies

``` bash
npm install
```

### 2. Create `.env.local`

``` bash
FINNHUB_API_KEY=your_finnhub_key
ANTHROPIC_API_KEY=your_anthropic_key   # optional
CLAUDE_MODEL=claude-3-5-sonnet-latest  # optional
```

Restart server after editing env variables.

------------------------------------------------------------------------

## 🧪 Run Dev Server

``` bash
npm run dev
```

App runs at:

http://localhost:3000

------------------------------------------------------------------------

## 🔍 Test API Routes

### Finnhub News

Browser: http://localhost:3000/api/fnn-feed

With parameters: http://localhost:3000/api/fnn-feed?days=3&limit=10
http://localhost:3000/api/fnn-feed?symbols=AMZN,TSLA

Using curl:

``` bash
curl http://localhost:3000/api/fnn-feed
curl "http://localhost:3000/api/fnn-feed?days=2&limit=5"
```

------------------------------------------------------------------------

### FDA + Healthcare RSS

Browser: http://localhost:3000/api/fda-feed

With limit: http://localhost:3000/api/fda-feed?limit=30

Using curl:

``` bash
curl http://localhost:3000/api/fda-feed
```

------------------------------------------------------------------------

## 📦 Project Structure

app/api/fnn-feed/route.ts\
app/api/fda-feed/route.ts\
data/trickers.json\
lib/

------------------------------------------------------------------------

## ⚠ Notes

-   Node 18+ required
-   Some tickers (e.g., SPACEX) may fail (not publicly traded)
-   Claude usage consumes tokens (API billing applies)

Built with Next.js 14, Finnhub API, RSS Parser, and Anthropic Claude.
