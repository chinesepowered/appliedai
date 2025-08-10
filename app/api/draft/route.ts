import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface DraftRequest {
  query: string;
  cases: Array<{
    id: string;
    name: string;
    court: string;
    date: string;
    snippet: string;
    url: string;
    jurisdiction: string;
    source?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: DraftRequest = await request.json();
    const { query, cases } = body;

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    if (!cases || cases.length === 0) {
      return NextResponse.json(
        { error: 'Cases are required for drafting arguments' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return NextResponse.json(
        { 
          error: 'AI service not configured',
          argument: generateFallbackArgument(query, cases)
        },
        { status: 200 }
      );
    }

    const genAI = new GoogleGenAI({
      vertexai: false,
      apiKey: apiKey,
    });

    const detailedCaseAnalysis = cases.map((case_, index) => 
      `CASE ${index + 1}: ${case_.name}
      
Court: ${case_.court}
Date: ${case_.date}
Jurisdiction: ${case_.jurisdiction}
Source: ${case_.source || 'Legal Database'}
Full Citation Link: ${case_.url}

CASE EXCERPT/HOLDINGS:
"${case_.snippet}"

LEGAL SIGNIFICANCE:
[This case is relevant to the query: "${query}"]`
    ).join('\n\n---\n\n');

    const prompt = `You are a legal research assistant tasked with drafting a comprehensive legal argument. You have access to relevant case law and should incorporate the full text and holdings of these cases into your analysis.

LEGAL QUESTION/ISSUE:
${query}

RELEVANT CASE LAW AND PRECEDENTS:
${detailedCaseAnalysis}

INSTRUCTIONS FOR DRAFTING:
Please draft a structured legal argument that:
1. Clearly states the legal issue presented
2. Provides detailed analysis of each relevant precedent with full citations
3. Extracts specific legal holdings and principles from the case law
4. Applies the precedential authority to the specific legal question
5. Addresses potential counterarguments and distinguishing factors
6. Considers jurisdictional hierarchy and binding vs. persuasive authority
7. Offers a reasoned legal conclusion based on the weight of authority

Include the full case names, courts, dates, and specific legal holdings in your analysis. Reference the exact legal principles established by each case and how they apply to the current issue.

Format your response as a professional legal memorandum with proper headings and complete citations.

MANDATORY DISCLAIMERS TO INCLUDE:
- This is an AI-generated draft argument for research purposes only
- All citations and legal reasoning must be independently verified by legal counsel
- This analysis does not constitute legal advice
- Practitioners must consult with qualified legal counsel and conduct independent research before relying on this analysis
- All case law should be shepardized/validated for current good law

Structure your response with these sections:
I. ISSUE PRESENTED
II. BRIEF ANSWER  
III. STATEMENT OF FACTS (if applicable)
IV. LEGAL ANALYSIS
   A. Applicable Legal Standard
   B. Analysis of Controlling Authority
   C. Analysis of Persuasive Authority
   D. Application to Present Issue
V. CONCLUSION

Ensure all case citations include complete court information, dates, and jurisdictions. Reference specific page numbers, holdings, and legal principles where available.`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });
    
    // Extract text from the response - the exact structure depends on the SDK
    let argument = 'No response generated';
    if (result && typeof result === 'object') {
      // Try different possible response structures
      argument = (result as any).text || 
                (result as any).content || 
                (result as any).candidates?.[0]?.content?.parts?.[0]?.text ||
                JSON.stringify(result);
    }

    return NextResponse.json({
      argument,
      query,
      casesUsed: cases.length,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Draft API error:', error);

    const fallbackArgument = generateFallbackArgument(
      'Unknown Query',
      []
    );

    return NextResponse.json({
      argument: fallbackArgument,
      error: 'AI service temporarily unavailable - showing template argument',
      generatedAt: new Date().toISOString(),
    });
  }
}

function generateFallbackArgument(query: string, cases: any[]): string {
  const caseList = cases.slice(0, 3).map((case_, index) => 
    `${index + 1}. ${case_.name} (${case_.court}, ${case_.date})`
  ).join('\n');

  return `LEGAL RESEARCH MEMORANDUM

I. ISSUE PRESENTED

${query}

II. BRIEF ANSWER

[AI service temporarily unavailable - this is a template showing the structure of a legal argument]

III. ANALYSIS

Based on the relevant case law identified through legal research, the following precedents are applicable:

RELEVANT PRECEDENTS:
${caseList || 'Cases would be listed here'}

[Detailed analysis of how each precedent applies to the current legal question would appear here, including:]

A. Primary Authority Analysis
- Supreme Court and circuit court decisions
- State court precedents where applicable
- Statutory interpretation and regulatory guidance

B. Factual Comparison
- How the facts of precedent cases compare to the current situation
- Distinguishing factors and similarities
- Jurisdictional considerations

C. Legal Reasoning
- Application of established legal principles
- Policy considerations and public interest factors
- Potential counterarguments and rebuttals

IV. CONCLUSION

[Reasoned conclusion based on case law analysis would appear here]

IMPORTANT DISCLAIMER:
This is a template legal argument structure. For a complete analysis:
1. Configure the Gemini AI API key in your environment variables
2. This template is for demonstration purposes only
3. All legal research must be independently verified
4. Consult qualified legal counsel before relying on any legal analysis
5. This is not legal advice and should not be used as such

Generated on: ${new Date().toLocaleDateString()}
Sources: Legal research database query results`;
}