# Legal Research Assistant

An AI-powered legal research tool that finds relevant case law and precedents, then drafts legal arguments using Google Gemini 2.5 Pro. Built for hackathon purposes with Next.js, Tailwind CSS, and integration with CourtListener and other free legal databases.

## Features

- 🔍 **Case Law Search**: Search across multiple legal databases including CourtListener and Justia
- ⚖️ **Jurisdiction Filtering**: Filter results by specific courts and jurisdictions  
- 🤖 **AI-Powered Analysis**: Generate legal arguments using Google Gemini 2.5 Pro
- 🔗 **Source Verification**: Direct links to original cases for verification
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🆓 **Free Sources**: Integrates with free legal databases and government resources

## Benefits

- **Improve Reliability**: AI analysis backed by verified case law sources
- **Accelerate Research**: Quickly find relevant precedents and draft initial arguments  
- **Maintain Accuracy**: All results link to original sources for human verification
- **High Stakes Ready**: Designed for legal professionals who need verified information

## Technology Stack

- **Frontend**: Next.js 15 with App Router, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **AI**: Google Gemini 2.5 Pro
- **Legal APIs**: CourtListener, Justia (with placeholders for additional sources)
- **Package Manager**: pnpm

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- pnpm
- Google Gemini API key
- CourtListener API token (optional but recommended)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd appliedai
   pnpm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env.local
   ```

3. **Configure API keys in `.env.local`:**
   ```env
   # Required: Get from https://aistudio.google.com/app/apikey
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Optional but recommended: Get from https://www.courtlistener.com/api/
   COURTLISTENER_API_TOKEN=your_courtlistener_token_here
   ```

4. **Run development server:**
   ```bash
   pnpm dev
   ```

5. **Open the application:**
   Navigate to `http://localhost:3000`

## Usage

1. **Enter Legal Query**: Describe your legal question or topic in the search field
2. **Select Jurisdiction**: Optionally filter by specific courts (US Supreme Court, Federal Circuits, State courts)
3. **Search Cases**: The system searches CourtListener and other legal databases
4. **Review Results**: Examine relevant cases with excerpts and direct links to sources
5. **Generate Argument**: Click "Draft Legal Argument" to create an AI-powered legal analysis
6. **Verify and Use**: Review the generated argument and verify all citations independently

## API Endpoints

- `POST /api/search` - Search for relevant case law
- `POST /api/draft` - Generate legal argument from case results

## Important Disclaimers

⚠️ **This tool is for research purposes only and does not provide legal advice.**

- All AI-generated content must be independently verified
- Case citations should be confirmed through official sources  
- Consult qualified legal counsel before relying on any analysis
- The tool is designed to accelerate research, not replace legal expertise

## Development

### Project Structure
```
app/
├── api/
│   ├── search/route.ts    # Case law search API
│   └── draft/route.ts     # Argument generation API
├── globals.css            # Global styles
├── layout.tsx            # App layout
└── page.tsx              # Main interface

.env.example              # Environment variables template
```

### Adding New Legal Sources

To integrate additional legal databases, extend the `searchAdditionalSources()` function in `/app/api/search/route.ts`:

```typescript
async function searchAdditionalSources(query: string, jurisdiction?: string) {
  const additionalCases = [];
  
  // Add new source integration here
  try {
    const newSourceResults = await searchNewSource(query, jurisdiction);
    additionalCases.push(...newSourceResults);
  } catch (error) {
    console.log('New source search failed:', error);
  }
  
  return additionalCases;
}
```

## Contributing

This is a hackathon project focused on demonstrating AI-powered legal research capabilities. Feel free to extend the functionality or add new legal data sources.

## License

MIT License - Built for educational and hackathon purposes.

---

**Built with ❤️ for the legal community to accelerate research and improve access to justice.**