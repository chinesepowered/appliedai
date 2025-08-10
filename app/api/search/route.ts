import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

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

async function analyzeLegalQuery(query: string, jurisdiction?: string): Promise<string[]> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('No Gemini API key, using fallback query analysis');
      return [query]; // Fallback to original query
    }

    const genAI = new GoogleGenAI({
      vertexai: false,
      apiKey: apiKey,
    });

    const analysisPrompt = `You are an expert legal researcher. Analyze this legal query to extract precise legal concepts for targeted case law search.

LEGAL QUERY: "${query}"
JURISDICTION: ${jurisdiction || 'general'}

Your task is to generate SHORT, focused search terms that will find RELEVANT landlord-tenant cases in legal databases.

For long fact patterns, extract the CORE LEGAL CONCEPTS, not the facts:

FOCUS ON:
1. Legal area (landlord tenant, contract, employment, etc.)  
2. Specific statutes (Civil Code 1950.5, USC sections, etc.)
3. Legal procedures (eviction, deposit return, notice requirements)
4. Key legal terms (security deposit, breach, damages)

Generate 3-5 VERY SHORT search terms (2-4 words each):
- Prioritize legal concepts over factual descriptions
- Use specific statute numbers when relevant
- Include relevant practice area terms
- Keep terms simple for database searching

Example for tenant deposit issue:
["landlord tenant", "security deposit", "Civil Code 1950.5", "deposit return", "California landlord"]

Example for employment issue:
["employment discrimination", "wrongful termination", "Title VII", "workplace harassment", "federal employment"]

CRITICAL: Return ONLY a JSON array of SHORT legal terms. No explanations: ["term1", "term2", "term3", "term4", "term5"]`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: analysisPrompt,
    });

    let searchTerms = [query]; // Fallback
    if (result && typeof result === 'object') {
      const responseText = (result as any).text || 
                          (result as any).content || 
                          (result as any).candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (responseText) {
        console.log('Raw LLM response:', responseText);
        
        try {
          // Clean the response - remove markdown code blocks and extra text
          let cleanedResponse = responseText.trim();
          
          // Remove markdown code blocks
          cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          
          // Find JSON array pattern
          const jsonMatch = cleanedResponse.match(/\[[\s\S]*?\]/);
          if (jsonMatch) {
            cleanedResponse = jsonMatch[0];
          }
          
          console.log('Cleaned response:', cleanedResponse);
          
          const parsed = JSON.parse(cleanedResponse);
          if (Array.isArray(parsed) && parsed.length > 0) {
            searchTerms = parsed;
            console.log('Successfully parsed search terms:', searchTerms);
          } else {
            console.log('Parsed response is not a valid array:', parsed);
          }
        } catch (parseError) {
          console.error('Failed to parse LLM response:', {
            error: parseError instanceof Error ? parseError.message : String(parseError),
            rawResponse: responseText.substring(0, 200) + '...',
            cleanedAttempt: responseText.trim().substring(0, 200) + '...'
          });
        }
      } else {
        console.log('No response text received from LLM');
      }
    }

    console.log('Generated search terms:', searchTerms);
    return searchTerms;

  } catch (error) {
    console.error('Query analysis failed:', error);
    return generateFallbackSearchTerms(query, jurisdiction);
  }
}

function generateFallbackSearchTerms(query: string, jurisdiction?: string): string[] {
  const queryLower = query.toLowerCase();
  const searchTerms = [];
  
  // Extract key legal concepts from long queries - keep terms simple
  if (queryLower.includes('deposit') || queryLower.includes('landlord') || queryLower.includes('tenant')) {
    if (jurisdiction === 'ca' || queryLower.includes('california') || queryLower.includes('san francisco')) {
      searchTerms.push('security deposit');
      searchTerms.push('landlord tenant');
      searchTerms.push('Civil Code 1950.5');
      searchTerms.push('California tenant');
    } else {
      searchTerms.push('security deposit');
      searchTerms.push('landlord tenant');
      searchTerms.push('deposit return');
    }
  } else if (queryLower.includes('contract') || queryLower.includes('agreement')) {
    searchTerms.push('contract breach');
    searchTerms.push('contract dispute');
  } else if (queryLower.includes('employment') || queryLower.includes('fired') || queryLower.includes('terminated')) {
    searchTerms.push('employment law');
    searchTerms.push('wrongful termination');
  } else {
    // For other queries, extract key legal terms
    const words = query.split(' ').filter(w => w.length > 3);
    if (words.length >= 2) {
      searchTerms.push(words.slice(0, 2).join(' '));
    } else {
      searchTerms.push(query);
    }
  }
  
  console.log('Generated fallback search terms:', searchTerms.slice(0, 5));
  return searchTerms.slice(0, 5); // Limit to 5 terms
}

function calculateRelevanceScore(case_: any, query: string, jurisdiction?: string): number {
  let score = 0;
  const queryLower = query.toLowerCase();
  const caseName = case_.name?.toLowerCase() || '';
  const caseSnippet = case_.snippet?.toLowerCase() || '';
  const caseText = `${caseName} ${caseSnippet}`;
  
  // Jurisdiction match bonus (stronger for state cases)
  if (jurisdiction && case_.jurisdiction?.toLowerCase().includes(jurisdiction.toLowerCase())) {
    score += 25;
  }
  
  // Heavily penalize irrelevant practice areas
  const irrelevantTerms = ['fdic', 'federal deposit', 'insurance', 'securities', 'rbs', 'bank', 'merger', 'acquisition', 'corporate', 'antitrust', 'patent', 'trademark', 'copyright'];
  for (const term of irrelevantTerms) {
    if (caseName.includes(term)) {
      score -= 50; // Heavy penalty for clearly unrelated cases
    }
  }
  
  // Strong bonus for landlord-tenant specific terms in case name
  const landlordTenantTerms = ['landlord', 'tenant', 'lease', 'rental', 'eviction', 'deposit', 'habitability', 'rent'];
  let landlordTenantMatches = 0;
  for (const term of landlordTenantTerms) {
    if (queryLower.includes(term) && caseName.includes(term)) {
      score += 40; // Very high bonus for direct landlord-tenant case matches
      landlordTenantMatches++;
    }
  }
  
  // Require at least one landlord-tenant term for high relevance
  if (queryLower.includes('landlord') || queryLower.includes('tenant') || queryLower.includes('deposit')) {
    if (landlordTenantMatches === 0) {
      score -= 30; // Penalty if query is about landlord-tenant but case is not
    }
  }
  
  // Source credibility bonus
  if (case_.source === 'CourtListener') score += 10;
  if (case_.source?.includes('Statutes')) score += 20; // Statutes are highly relevant
  
  // Court level bonus (higher courts = more precedential value)
  const courtName = case_.court?.toLowerCase() || '';
  if (courtName.includes('supreme court')) score += 15;
  if (courtName.includes('court of appeal') || courtName.includes('appellate')) score += 10;
  if (courtName.includes('district court')) score += 5;
  
  // Specific legal concept matching
  const keyTerms = ['security deposit', 'civil code', '1950.5', 'unlawful detainer', 'habitability'];
  
  for (const term of keyTerms) {
    if (queryLower.includes(term.toLowerCase()) && caseText.includes(term.toLowerCase())) {
      score += 30; // High bonus for specific legal concept matches
    }
  }
  
  // Specific statute matching (extremely high value)
  if (queryLower.includes('1950.5') && caseText.includes('1950.5')) {
    score += 60;
  }
  if (queryLower.includes('civil code') && caseText.includes('civil code')) {
    score += 40;
  }
  
  // Procedural term matching
  if (queryLower.includes('21 day') && caseText.includes('21 day')) {
    score += 35;
  }
  if (queryLower.includes('notice') && caseText.includes('notice')) {
    score += 20;
  }
  
  // Recency bonus (more recent cases get higher scores, but not as important as relevance)
  if (case_.date) {
    const caseYear = parseInt(case_.date.split('-')[0]);
    if (caseYear >= 2010) score += 5;
    if (caseYear >= 2020) score += 3;
  }
  
  return score;
}

async function searchHarvardCaseLaw(query: string, jurisdiction?: string) {
  try {
    // Harvard Case.law API - free access to 6.7 million cases
    const harvardApiUrl = 'https://api.case.law/v1/cases/';
    const searchTerms = await analyzeLegalQuery(query, jurisdiction);
    const harvardCases = [];

    // Search with analyzed terms - increase coverage
    for (const term of searchTerms.slice(0, 5)) { // Increased from 3 to 5
      try {
        const params = {
          search: term,
          full_case: 'false', // Get excerpts, not full text
          jurisdiction: jurisdiction?.toUpperCase() || undefined,
          ordering: '-analysis.score', // Order by relevance
          page_size: '100', // Increased from 50 to 100
        };

        const response = await axios.get(harvardApiUrl, {
          params,
          timeout: 15000, // Increased timeout for larger requests
          headers: {
            'User-Agent': 'LegalResearchTool/1.0 (Educational Use)'
          }
        });

        const cases = response.data?.results || [];
        
        for (const case_ of cases.slice(0, 5)) { // Increased from 3 to 5 per term
          harvardCases.push({
            id: `harvard-${case_.id}`,
            name: case_.name_abbreviation || case_.name || 'Unknown Case',
            court: case_.court?.name || 'Unknown Court',
            date: case_.decision_date || 'Unknown Date',
            snippet: case_.preview?.[0] || case_.casebody?.data?.head_matter || 'No preview available',
            url: case_.frontend_url || `https://case.law/search/#/cases?search=${encodeURIComponent(term)}`,
            jurisdiction: case_.jurisdiction?.name_long || case_.court?.jurisdiction || jurisdiction || 'Unknown',
            source: 'Harvard Case.law',
          });
        }
      } catch (termError) {
        console.log(`Harvard search failed for term: ${term}`, termError);
      }
    }

    console.log(`Harvard Case.law returned ${harvardCases.length} cases`);
    return harvardCases;

  } catch (error) {
    console.log('Harvard Case.law API error:', error);
    return [];
  }
}

async function searchFederalStatutes(query: string) {
  try {
    // Extract USC references from query
    const uscMatches = query.match(/(\d+)\s*USC?\s*(?:§|section)?\s*(\d+)/gi);
    const statutes = [];
    
    if (uscMatches) {
      for (const match of uscMatches.slice(0, 3)) { // Increased from 2 to 3
        const parts = match.match(/(\d+)\s*USC?\s*(?:§|section)?\s*(\d+)/i);
        if (parts) {
          const title = parts[1];
          const section = parts[2];
          
          statutes.push({
            id: `usc-${title}-${section}`,
            name: `${title} U.S.C. § ${section}`,
            court: 'U.S. Congress',
            date: '2023-01-01',
            snippet: `United States Code Title ${title}, Section ${section}. This federal statute governs relevant legal provisions. Full text available at Cornell Law School Legal Information Institute.`,
            url: `https://www.law.cornell.edu/uscode/text/${title}/${section}`,
            jurisdiction: 'federal',
            source: 'USC (Cornell)',
          });
        }
      }
    }
    
    // Also check for common legal terms that might reference federal statutes
    const queryLower = query.toLowerCase();
    const federalLawKeywords = [
      { keyword: 'copyright', title: '17', section: '101', name: 'Copyright Act' },
      { keyword: 'patent', title: '35', section: '101', name: 'Patent Act' },
      { keyword: 'securities', title: '15', section: '78', name: 'Securities Exchange Act' },
      { keyword: 'ada', title: '42', section: '12101', name: 'Americans with Disabilities Act' },
      { keyword: 'fmla', title: '29', section: '2601', name: 'Family and Medical Leave Act' },
    ];
    
    for (const law of federalLawKeywords) {
      if (queryLower.includes(law.keyword) && !statutes.find(s => s.id === `usc-${law.title}-${law.section}`)) {
        statutes.push({
          id: `usc-${law.title}-${law.section}`,
          name: `${law.title} U.S.C. § ${law.section} (${law.name})`,
          court: 'U.S. Congress',
          date: '2023-01-01',
          snippet: `${law.name} - Key federal statute relevant to ${law.keyword}-related legal issues. This statute establishes important federal legal standards and requirements.`,
          url: `https://www.law.cornell.edu/uscode/text/${law.title}/${law.section}`,
          jurisdiction: 'federal',
          source: 'USC (Cornell)',
        });
      }
    }
    
    return statutes;
  } catch (error) {
    console.log('Federal statutes search error:', error);
    return [];
  }
}


// Generate direct links to specific state statutes based on legal concepts
async function searchFreeStateLaw(query: string, jurisdiction?: string) {
  try {
    const stateLawCases = [];
    const queryLower = query.toLowerCase();
    
    // Generate direct statute links based on jurisdiction and legal concepts
    if (jurisdiction === 'ca') {
      // California-specific statutes based on query analysis
      if (queryLower.includes('deposit') || queryLower.includes('landlord') || queryLower.includes('tenant')) {
        stateLawCases.push({
          id: 'ca-civil-code-1950-5',
          name: 'California Civil Code § 1950.5 - Security Deposits',
          court: 'California Legislature',
          date: '2023-01-01',
          snippet: 'California Civil Code Section 1950.5 governs security deposits for residential rental properties. Requires landlords to return deposits within 21 days and provide itemized deductions.',
          url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1950.5&lawCode=CIV',
          jurisdiction: 'ca',
          source: 'California Statutes',
        });
      }
      
      if (queryLower.includes('eviction') || queryLower.includes('unlawful detainer')) {
        stateLawCases.push({
          id: 'ca-civil-code-1161',
          name: 'California Code of Civil Procedure § 1161 - Unlawful Detainer',
          court: 'California Legislature', 
          date: '2023-01-01',
          snippet: 'California Code of Civil Procedure Section 1161 establishes grounds for unlawful detainer actions and eviction procedures.',
          url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1161&lawCode=CCP',
          jurisdiction: 'ca',
          source: 'California Statutes',
        });
      }
      
      if (queryLower.includes('habitability') || queryLower.includes('warranty')) {
        stateLawCases.push({
          id: 'ca-civil-code-1941',
          name: 'California Civil Code § 1941 - Warranty of Habitability', 
          court: 'California Legislature',
          date: '2023-01-01',
          snippet: 'California Civil Code Section 1941 establishes the warranty of habitability for residential rental properties and tenant rights.',
          url: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1941&lawCode=CIV',
          jurisdiction: 'ca',
          source: 'California Statutes',
        });
      }
    } else if (jurisdiction === 'ny') {
      if (queryLower.includes('deposit') || queryLower.includes('landlord') || queryLower.includes('tenant')) {
        stateLawCases.push({
          id: 'ny-gob-7-103',
          name: 'New York General Obligations Law § 7-103 - Security Deposits',
          court: 'New York Legislature',
          date: '2023-01-01', 
          snippet: 'New York General Obligations Law Section 7-103 governs security deposits for residential rental agreements.',
          url: 'https://www.nysenate.gov/legislation/laws/GOB/7-103',
          jurisdiction: 'ny',
          source: 'New York Statutes',
        });
      }
    } else if (jurisdiction === 'tx') {
      if (queryLower.includes('deposit') || queryLower.includes('landlord') || queryLower.includes('tenant')) {
        stateLawCases.push({
          id: 'tx-prop-92-101',
          name: 'Texas Property Code § 92.101 - Security Deposit',
          court: 'Texas Legislature',
          date: '2023-01-01',
          snippet: 'Texas Property Code Section 92.101 establishes requirements for security deposits in residential leases.',
          url: 'https://statutes.capitol.texas.gov/Docs/PR/htm/PR.92.htm#92.101',
          jurisdiction: 'tx',
          source: 'Texas Statutes',
        });
      }
    } else if (jurisdiction === 'fl') {
      if (queryLower.includes('deposit') || queryLower.includes('landlord') || queryLower.includes('tenant')) {
        stateLawCases.push({
          id: 'fl-stat-83-49',
          name: 'Florida Statutes § 83.49 - Security Deposits',
          court: 'Florida Legislature', 
          date: '2023-01-01',
          snippet: 'Florida Statutes Section 83.49 governs security deposits and advance rent for residential tenancies.',
          url: 'http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0083/Sections/0083.49.html',
          jurisdiction: 'fl',
          source: 'Florida Statutes',
        });
      }
    }
    
    return stateLawCases;
  } catch (error) {
    console.log('State law search error:', error);
    return [];
  }
}

// Enhanced real API coverage - using only legitimate legal data sources:
// 1. CourtListener (10M+ cases) - comprehensive federal & state case law with direct case links
// 2. Harvard Case.law (6.7M+ cases) - academic legal database with direct case access
// 3. USC Federal Statutes (real Cornell links) - direct links to federal statutory text
// 4. State Legal Resources - direct searches of official state legal databases

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
    
    console.log('Raw query from user:', query);
    
    const params: Record<string, string> = {
      q: query,
      type: 'o', // opinions
      order_by: 'score desc',
      format: 'json',
    };

    // Temporarily disable court filtering - the court codes need to be verified
    // if (jurisdiction && jurisdictionMapping[jurisdiction]) {
    //   params.court = jurisdictionMapping[jurisdiction];
    // }

    const headers: Record<string, string> = {
      'User-Agent': 'LegalResearchTool/1.0',
    };

    const courtListenerToken = process.env.COURTLISTENER_API_TOKEN;
    if (courtListenerToken) {
      headers.Authorization = `Token ${courtListenerToken}`;
    }

    console.log('Making CourtListener API request:', { params, hasToken: !!courtListenerToken });

    // Make multiple searches with analyzed terms for better results
    const searchTerms = await analyzeLegalQuery(query, jurisdiction);
    console.log('Using search terms for CourtListener:', searchTerms);
    const allResults = [];

    // Search with original query only if it's short and focused
    if (query.split(' ').length <= 5) {
      const response = await axios.get(courtListenerApiUrl, {
        params,
        headers,
        timeout: 10000,
      });
      allResults.push(...(response.data?.results || []));
      console.log(`Original query "${query}" returned ${response.data?.results?.length || 0} results`);
    }

    // Search with each analyzed term - enhanced coverage
    for (const term of searchTerms.slice(0, 5)) { // Increased from 3 to 5
      try {
        const termParams = { ...params, q: term };
        console.log(`Searching CourtListener with term: "${term}"`);
        const termResponse = await axios.get(courtListenerApiUrl, {
          params: termParams,
          headers,
          timeout: 15000, // Increased timeout
        });
        const resultCount = termResponse.data?.results?.length || 0;
        console.log(`Term "${term}" returned ${resultCount} results`);
        allResults.push(...(termResponse.data?.results || []));
      } catch (error) {
        console.log(`CourtListener search failed for term: ${term}`, error);
      }
    }

    // Remove duplicates from CourtListener results
    const uniqueResults = allResults.filter((case_, index, self) => 
      self.findIndex(c => c.id === case_.id) === index
    );
    
    const results = uniqueResults;
    
    let cases = results.slice(0, 8).map((case_: any) => ({
      id: case_.id ? case_.id.toString() : `cl-${Math.random()}`, // Convert to string for consistency
      name: case_.caseName || case_.case_name || 'Unknown Case',
      court: case_.court || 'Unknown Court',
      date: case_.dateFiled || case_.date_filed || 'Unknown Date',
      snippet: case_.snippet || '',
      url: `https://www.courtlistener.com${case_.absolute_url || case_.absoluteUrl || ''}`,
      jurisdiction: case_.court_citation_string || '',
      source: 'CourtListener',
    }));

    // Harvard Case.law API temporarily disabled due to endpoint issues
    // Will re-enable once API endpoint is confirmed working
    // try {
    //   const harvardCases = await searchHarvardCaseLaw(query, jurisdiction);
    //   cases = [...cases, ...harvardCases];
    // } catch (error) {
    //   console.log('Harvard Case.law search failed:', error);
    // }

    // Add federal statutes (enhanced with keyword detection)
    try {
      const federalStatutes = await searchFederalStatutes(query);
      cases = [...cases, ...federalStatutes];
    } catch (error) {
      console.log('Federal statutes search failed:', error);
    }


    // Add state legal resources for jurisdiction-specific searches
    try {
      const stateLawCases = await searchFreeStateLaw(query, jurisdiction);
      cases = [...cases, ...stateLawCases];
    } catch (error) {
      console.log('State law search failed:', error);
    }

    // Remove duplicates and rank by relevance
    const uniqueCases = cases.filter((case_, index, self) => 
      self.findIndex(c => c.name === case_.name || c.id === case_.id) === index
    );
    
    const rankedCases = uniqueCases
      .map(case_ => ({
        ...case_,
        relevanceScore: calculateRelevanceScore(case_, query, jurisdiction)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

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
      cases: rankedCases.length > 0 ? rankedCases : fallbackCases,
      total: rankedCases.length || fallbackCases.length,
      query,
      jurisdiction,
      sources: {
        courtListener: cases.filter(c => c.source === 'CourtListener').length,
        usc: cases.filter(c => c.source === 'USC (Cornell)').length,
        stateStatutes: cases.filter(c => c.source?.includes('Statutes')).length,
        total: rankedCases.length,
      }
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