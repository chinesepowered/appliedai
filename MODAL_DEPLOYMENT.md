# 🚀 Modal Deployment Guide for Hackathon Demo

## Quick Setup (2-3 minutes)

### 1. Environment Variables
Add these to your `.env.local` and Vercel dashboard:

```bash
# Modal API credentials
MODAL_TOKEN_ID=ak-HF6y13YJzKEQ6HAnZQJIsn
MODAL_TOKEN_SECRET=as-GZNsL0xDyvqhanHenajFr1

# Your existing Gemini key
GOOGLE_GEMINI_API_KEY=your_gemini_key_here

# Optional: CourtListener API for real case data
COURTLISTENER_TOKEN=your_courtlistener_token
```

### 2. Deploy Modal Functions

```bash
# Install Modal
pip install modal

# Deploy the research functions
python modal_research.py
```

### 3. Vercel Environment Variables

In your Vercel dashboard → Settings → Environment Variables, add:
- `MODAL_TOKEN_ID`
- `MODAL_TOKEN_SECRET` 
- `GOOGLE_GEMINI_API_KEY`
- `COURTLISTENER_TOKEN` (optional)

### 4. Test the Demo

1. Push to GitHub (auto-deploys to Vercel)
2. Visit `/opposingcounsel` 
3. Enter: "Landlord security deposit dispute California"
4. Click "Deep Research Tree"
5. Watch the expandable tree build with real legal research!

## Demo Features for Judges

- **Visual Research Tree**: Shows argument → opposition → counter-rebuttal chains
- **Real Case Citations**: Click to expand with court details and links
- **Live Processing Stats**: Modal function execution times and case counts
- **Case Strength Scoring**: Algorithmic confidence assessment
- **Parallel Research**: Multiple Modal functions running simultaneously

## Fallback Mode

If Modal is unavailable, the system gracefully falls back to mock data so the demo always works.

## Performance

- **Cold Start**: ~3-5 seconds for first Modal function
- **Warm Functions**: ~1-2 seconds for subsequent calls
- **Parallel Execution**: 3-5 Modal functions run simultaneously
- **Auto-scaling**: Handles multiple users without configuration

Perfect for a hackathon demo that needs to work reliably under pressure! 🎯
