import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

interface SearchRequest {
  query: string;
  jurisdiction?: string;
}

interface CourtListenerCase {
  id: number;
  resource_uri: string;
  absolute_url: string;
  cluster: {
    case_name: string;
    date_filed: string;
    docket: {
      court: {
        short_name: string;
        full_name: string;
        jurisdiction: string;
      };
    };
  };
  snippet: string;
  type: string;
}

const jurisdictionMapping: Record<string, string> = {
  'supreme-court': 'scotus',
  'federal-circuit': 'ca1,ca2,ca3,ca4,ca5,ca6,ca7,ca8,ca9,ca10,ca11,cadc',
  'ca': 'cal,calctapp,calsupct',
  'ny': 'ny,nyappterm,nysupct',
  'tx': 'tex,texapp,texcrimapp,texsupct',
  'fl': 'fla,flaapp,flasupct',
};

async function searchAdditionalSources(query: string, jurisdiction?: string) {
  const additionalCases = [];
  
  // Justia case law (free resource)
  try {
    const justiaResults = await searchJustia(query, jurisdiction);
    additionalCases.push(...justiaResults);
  } catch (error) {
    console.log('Justia search failed:', error);
  }

  // Add more sources here (Google Scholar, Legal Information Institute, etc.)
  
  return additionalCases.slice(0, 3); // Limit additional sources
}

async function searchJustia(query: string, jurisdiction?: string) {
  // This is a placeholder for Justia integration
  // In a real implementation, you would integrate with Justia's search API or scraping
  
  const mockJustiaResults = [
    {
      id: `justia-${Date.now()}`,
      name: `Justia Case: ${query.substring(0, 30)}...`,
      court: 'Various Courts',
      date: '2023-06-01',
      snippet: `Justia legal database result for "${query}". This is a placeholder showing how additional legal sources would be integrated.`,
      url: `https://law.justia.com/cases/`,
      jurisdiction: jurisdiction || 'multi-state',
      source: 'Justia',
    }
  ];
  
  return mockJustiaResults;
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchRequest = await request.json();
    const { query, jurisdiction } = body;

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    const courtListenerApiUrl = 'https://www.courtlistener.com/api/rest/v4/search/';
    
    const params: Record<string, string> = {
      q: query,
      type: 'o', // opinions
      order_by: 'score desc',
      format: 'json',
    };

    if (jurisdiction && jurisdictionMapping[jurisdiction]) {
      params.court = jurisdictionMapping[jurisdiction];
    }

    const headers: Record<string, string> = {
      'User-Agent': 'LegalResearchTool/1.0',
    };

    const courtListenerToken = process.env.COURTLISTENER_API_TOKEN;
    if (courtListenerToken) {
      headers.Authorization = `Token ${courtListenerToken}`;
    }

    console.log('Making CourtListener API request:', { params, hasToken: !!courtListenerToken });

    const response = await axios.get(courtListenerApiUrl, {
      params,
      headers,
      timeout: 10000,
    });

    const results = response.data?.results || [];
    
    let cases = results.slice(0, 8).map((case_: CourtListenerCase) => ({
      id: case_.id,
      name: case_.cluster?.case_name || 'Unknown Case',
      court: case_.cluster?.docket?.court?.short_name || case_.cluster?.docket?.court?.full_name || 'Unknown Court',
      date: case_.cluster?.date_filed || 'Unknown Date',
      snippet: case_.snippet || '',
      url: `https://www.courtlistener.com${case_.absolute_url}`,
      jurisdiction: case_.cluster?.docket?.court?.jurisdiction || '',
      source: 'CourtListener',
    }));

    // Add additional free legal sources
    try {
      const additionalSources = await searchAdditionalSources(query, jurisdiction);
      cases = [...cases, ...additionalSources].slice(0, 10);
    } catch (error) {
      console.log('Additional sources search failed:', error);
    }

    const fallbackCases = [];
    if (cases.length === 0) {
      fallbackCases.push(
        {
          id: 'sample-1',
          name: 'Sample Case v. Example Corp',
          court: 'Supreme Court',
          date: '2023-05-15',
          snippet: 'This is a sample case result. In a real implementation, this would show actual case law results from CourtListener and other legal databases.',
          url: 'https://www.courtlistener.com',
          jurisdiction: 'federal',
          source: 'Demo',
        },
        {
          id: 'sample-2', 
          name: 'Another Sample v. Test LLC',
          court: 'Federal Circuit',
          date: '2023-03-10',
          snippet: 'Another sample case demonstrating the UI. Real results would come from CourtListener API and additional legal databases once properly configured.',
          url: 'https://www.courtlistener.com',
          jurisdiction: 'federal',
          source: 'Demo',
        }
      );
    }

    return NextResponse.json({
      cases: cases.length > 0 ? cases : fallbackCases,
      total: response.data?.count || fallbackCases.length,
      query,
      jurisdiction,
    });

  } catch (error) {
    console.error('Search API error:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('CourtListener API error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    const fallbackCases = [
      {
        id: 'fallback-1',
        name: 'Fallback Case Example',
        court: 'Demo Court',
        date: '2023-01-01',
        snippet: 'This is a fallback result shown when the CourtListener API is not available. Configure your API token in environment variables.',
        url: 'https://www.courtlistener.com',
        jurisdiction: 'demo',
      }
    ];

    return NextResponse.json({
      cases: fallbackCases,
      total: 1,
      query: 'Error occurred',
      error: 'Search service temporarily unavailable',
    });
  }
}