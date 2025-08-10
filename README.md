# Legal Research Assistant

An AI-powered legal research tool that finds relevant case law and precedents, then drafts legal arguments using Google Gemini 2.5 Pro. Built for hackathon purposes with Next.js, Tailwind CSS, and integration with CourtListener and other free legal databases.

## Features

- 🔍 **Intelligent Case Law Search**: AI-powered query analysis generates targeted search terms across multiple legal databases
- ⚖️ **Jurisdiction-Specific Results**: Filter by courts with contextually relevant cases (CA Civil Code for SF tenant issues, etc.)  
- 🤖 **Advanced AI Analysis**: Google Gemini 2.5 Pro with enhanced legal context processing
- 🔗 **Automatic Citation Linking**: Legal references (Civil Code § 1950.5, USC sections) auto-link to official sources
- 📚 **Multi-Source Integration**: CourtListener, Harvard Case.law, USC statutes, plus state legal resources
- 📱 **Professional Interface**: Clean, accessible design with proper text contrast and usability

## Benefits

- **Improve Reliability**: AI analysis backed by verified case law sources
- **Accelerate Research**: Quickly find relevant precedents and draft initial arguments  
- **Maintain Accuracy**: All results link to original sources for human verification
- **High Stakes Ready**: Designed for legal professionals who need verified information

## Technology Stack

- **Frontend**: Next.js 15 with App Router, React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes
- **AI**: Google Gemini 2.5 Pro
- **Legal APIs**: CourtListener, Harvard Case.law, USC (Cornell), State Legal Resources
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

1. **Enter Legal Query**: Describe your legal question (e.g., "client is a renter in San Francisco, landlord didn't return deposit")
2. **Select Jurisdiction**: Optionally filter by specific courts - the AI will prioritize relevant local law
3. **AI Analysis**: System uses LLM to extract legal concepts and generate targeted search terms
4. **Smart Search**: Searches multiple databases with relevant terms (Civil Code 1950.5, security deposit law, etc.)
5. **Review Results**: Examine contextually relevant cases with excerpts and direct links to sources
6. **Generate Argument**: AI creates comprehensive legal analysis with automatically linked citations
7. **Professional Output**: Review structured legal memorandum with clickable statute links

## Key Improvements

🎯 **Dramatically Better Relevance**: Instead of random constitutional cases, you'll get *Granberry v. Islay Investments* for SF tenant deposit issues

🔗 **Auto-Linking Citations**: References like "California Civil Code § 1950.5" become clickable links to official statute text

🧠 **Smart Query Processing**: AI extracts legal concepts ("security deposit" + "21 day notice" + "California") for targeted searches

📖 **Enhanced Multi-Source Coverage**: Live data from CourtListener (10M cases), Harvard Case.law (6.7M cases), USC statutes, plus direct state legal resource links

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