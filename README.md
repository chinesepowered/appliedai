# Legal Research Assistant

An AI-powered legal research tool that finds relevant case law and precedents, then drafts legal arguments using Google Gemini 2.5 Pro. Built for hackathon purposes with Next.js, Tailwind CSS, and integration with CourtListener and other free legal databases.

## Features

- 🔍 **Intelligent Case Law Search**: AI-powered query analysis generates targeted search terms across multiple legal databases
- ⚖️ **Jurisdiction-Specific Results**: Filter by courts with contextually relevant cases (CA Civil Code for SF tenant issues, etc.)  
- 🤖 **Advanced AI Analysis**: Google Gemini 2.5 Pro with enhanced legal context processing
- 🔗 **Automatic Citation Linking**: Legal references (Civil Code § 1950.5, USC sections) auto-link to official sources
- 📚 **Multi-Source Integration**: CourtListener, Harvard Case.law, USC statutes, plus state legal resources
- 📱 **Professional Interface**: Clean, accessible design with proper text contrast and usability
- ⚔️ **Opposing Counsel Mode**: Multi-agent adversarial system for comprehensive legal analysis

## Opposing Counsel Mode

The Opposing Counsel feature implements a multi-agent adversarial system that strengthens legal arguments by automatically finding counter-arguments and weaknesses. This mode operates through three phases:

**Primary Argument Generation**: The system researches supporting case law and builds the strongest possible argument for your position using relevant precedents and legal principles.

**Opposition Analysis**: A separate AI agent assumes the role of opposing counsel, searching for contrary authority, distinguishing cases, and identifying factual or legal gaps that could undermine the primary argument.

**Counter-Rebuttal Synthesis**: The system generates responses to opposition points, distinguishes contrary cases, and reinforces the original argument with additional authority.

### Modal Infrastructure Usage

This application demonstrates several key Modal platform capabilities:

**Modal Components Utilized**:
- `modal.App`: Main deployment unit coordinating all serverless functions
- `modal.Image.debian_slim()`: Custom container images with legal research dependencies (google-generativeai, requests, fastapi)
- `modal.Secret.from_name()`: Secure environment variable management for API keys (Gemini, CourtListener)
- `@modal.function()`: Serverless function decorator with automatic scaling and timeout management
- `@modal.fastapi_endpoint()`: HTTP endpoint creation with built-in CORS and request handling
- `function.remote()`: Parallel function invocation for concurrent legal research tasks

**Parallel Processing Architecture**:
When building a research tree, Modal functions execute simultaneously across multiple containers: one searches for primary supporting cases, another finds opposing authority, and a third generates counter-arguments. This parallel execution reduces research time from sequential minutes to concurrent seconds.

**Modal Functions Deployed**:
- `search_primary_cases`: Queries CourtListener API for supporting precedents
- `search_opposing_cases`: Finds contrary authority and distinguishing cases  
- `generate_argument`: Uses Gemini 2.5 Flash for legal reasoning and IRAC analysis
- `recursive_research_node`: Orchestrates multi-level argument development
- `research_endpoint`: FastAPI web interface for Next.js integration

**Deployment**: Functions are deployed to Modal's cloud using `modal deploy` and accessible via HTTPS endpoints with automatic SSL, load balancing, and geographic distribution.

The result is a comprehensive legal analysis that anticipates opposition arguments and provides attorneys with both offensive and defensive strategies, backed by real case law and structured legal reasoning.

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

## 🌳 **Modal-Powered Research Tree**

The opposing counsel mode now features a **recursive research tree** powered by Modal's serverless infrastructure for parallel legal research at scale.

### Key Features:
- **🔍 Deep Research**: Recursively explores argument → opposition → counter-rebuttal chains
- **⚡ Parallel Processing**: Modal functions run simultaneously across multiple legal databases
- **📊 Real-time Metrics**: Live case analysis counts, processing times, and confidence scores
- **🎯 Clickable Citations**: Expandable case details with direct links to full opinions
- **💪 Case Strength Scoring**: Algorithmic assessment of argument strength (0-100)

### Modal Integration:
```bash
# Setup Modal secrets and deploy research functions
python modal_setup.py

# Or manually:
pip install modal
modal setup
export GOOGLE_GEMINI_API_KEY=your_key_here
python modal_research.py
```

### Research Tree Demo Flow:
1. **Enter Query**: "Landlord security deposit dispute"
2. **Build Tree**: Triggers parallel Modal functions for primary research
3. **Expand Opposition**: Click to find contrary authority and counter-arguments  
4. **Strengthen Position**: Generate rebuttals that address opposition points
5. **Explore Sources**: Click any case for full citation details and court links

The system uses **multi-agent orchestration** where different AI models research from opposing perspectives, ensuring comprehensive case analysis that lawyers can trust for real practice.


