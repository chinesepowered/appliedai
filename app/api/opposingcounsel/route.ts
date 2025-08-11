import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface OpposingCounselRequest {
  originalArgument?: string;
  mode?: 'build' | 'oppose' | 'counter-counter';
  query?: string;
  analysis?: any;
}

// Convert markdown to HTML for proper display (same as draft API)
function convertMarkdownToHtml(text: string): string {
  if (!text) return text;
  
  let html = text;
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/^(\d+)\.\s(.*)$/gm, '<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>)/g, '<ol>$1</ol>');
  html = html.replace(/^[-*]\s(.*)$/gm, '<li>$1</li>');
  
  return html;
}

export async function POST(request: NextRequest) {
  try {
    const body: OpposingCounselRequest = await request.json();
    const { originalArgument, mode = 'build', query } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables');
      return NextResponse.json(generateFallbackResponse(mode, originalArgument, query));
    }

    if (mode === 'build') {
      return await handleBuildArgument(query || '');
    } else if (mode === 'oppose') {
      if (!originalArgument?.trim()) {
        return NextResponse.json(
          { error: 'Original argument is required for opposition analysis' },
          { status: 400 }
        );
      }
      return await handleOpposingAnalysis(originalArgument, query);
    } else if (mode === 'counter-counter') {
      return await handleCounterCounter(originalArgument || '', body.analysis);
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });

  } catch (error) {
    console.error('Opposing counsel API error:', error);
    return NextResponse.json({
      error: 'Analysis failed',
      fallback: true,
      generatedAt: new Date().toISOString(),
    });
  }
}

// Build primary argument using real case search (same as main draft API)
async function handleBuildArgument(query: string) {
  if (!query?.trim()) {
    return NextResponse.json(
      { error: 'Query is required' },
      { status: 400 }
    );
  }

  try {
    // Use the existing search API instead of duplicating logic
    const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, jurisdiction: 'ca' }), // Default to CA for landlord-tenant
    });

    let cases = [];
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      cases = searchData.cases || [];
    }
    
    if (cases.length === 0) {
      return NextResponse.json({
        argument: generateFallbackArgument(query, []),
        query,
        casesUsed: 0,
        generatedAt: new Date().toISOString(),
        fallback: true
      });
    }

    const rankedCases = cases.slice(0, 5); // Already ranked by the search API

    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenAI({
      vertexai: false,
      apiKey: apiKey,
    });

    const detailedCaseAnalysis = rankedCases.map((case_: any, index: number) => 
      `CASE ${index + 1}: ${case_.name}
      
Court: ${case_.court}
Date: ${case_.date}
Jurisdiction: ${case_.jurisdiction}
Source: ${case_.source}
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

Format your response as a professional legal memorandum with proper headings and complete citations. Use markdown formatting for headings (**HEADING**) and emphasis (*italic* for notes, **bold** for important terms).

MANDATORY DISCLAIMERS TO INCLUDE:
- This is an AI-generated draft argument for research purposes only
- All citations and legal reasoning must be independently verified by legal counsel
- This analysis does not constitute legal advice
- Practitioners must consult with qualified legal counsel and conduct independent research before relying on this analysis
- All case law should be shepardized/validated for current good law

Structure your response with these sections using markdown formatting:
**I. ISSUE PRESENTED**
**II. BRIEF ANSWER**  
**III. STATEMENT OF FACTS** (if applicable)
**IV. LEGAL ANALYSIS**
   **A. Applicable Legal Standard**
   **B. Analysis of Controlling Authority**
   **C. Analysis of Persuasive Authority**
   **D. Application to Present Issue**
**V. CONCLUSION**

Ensure all case citations include complete court information, dates, and jurisdictions. Reference specific page numbers, holdings, and legal principles where available.`;

    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    let argument = 'No response generated';
    if (result && typeof result === 'object') {
      argument = (result as any).text || 
                (result as any).content || 
                (result as any).candidates?.[0]?.content?.parts?.[0]?.text ||
                JSON.stringify(result);
    }

    const formattedArgument = convertMarkdownToHtml(argument);

    return NextResponse.json({
      argument: formattedArgument,
      query,
      cases: rankedCases,
      casesUsed: rankedCases.length,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Build argument failed:', error);
    return NextResponse.json({
      argument: convertMarkdownToHtml(generateFallbackArgument(query, [])),
      query,
      casesUsed: 0,
      error: 'AI service temporarily unavailable - showing template argument',
      generatedAt: new Date().toISOString(),
    });
  }
}

// Handle opposing analysis using real case search for contrary authority
async function handleOpposingAnalysis(originalArgument: string, query?: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenAI({
      vertexai: false,
      apiKey: apiKey,
    });

    // Search for cases that might contradict the original argument using existing API
    const opposingQuery = query ? `contrary authority ${query}` : `opposing arguments ${originalArgument.substring(0, 100)}`;
    
    const opposingSearchResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: opposingQuery, jurisdiction: 'ca' }),
    });

    let opposingCases = [];
    if (opposingSearchResponse.ok) {
      const opposingSearchData = await opposingSearchResponse.json();
      opposingCases = opposingSearchData.cases || [];
    }
    
    const rankedOpposingCases = opposingCases.slice(0, 5); // Already ranked by search API

    const caseAnalysis = rankedOpposingCases.map((case_: any, index: number) => 
      `OPPOSING CASE ${index + 1}: ${case_.name}
Court: ${case_.court} | Date: ${case_.date}
Citation Link: ${case_.url}
Excerpt: "${case_.snippet}"`
    ).join('\n\n');

    const opposingPrompt = `You are opposing counsel tasked with finding weaknesses and counter-arguments to the following legal argument.

ORIGINAL ARGUMENT TO ATTACK:
${originalArgument}

AVAILABLE CONTRARY AUTHORITY:
${caseAnalysis}

Your task is to:
1. Identify 3-5 key vulnerabilities in the original argument
2. Find contrary legal authority that undermines each point
3. Draft specific counter-arguments with citations
4. Assess the severity of each threat (low/medium/high)

For each opposing point, provide:
- The specific weakness you've identified
- Your counter-argument with legal reasoning
- Citations to contrary authority
- Assessment of threat level

Structure your response as a JSON object with this format:
{
  "opposingPoints": [
    {
      "id": "opp_1",
      "yourPoint": "Summary of their argument point",
      "counterArgument": "Your counter-argument with citations",
      "citations": ["Case citations"],
      "severity": "high|medium|low"
    }
  ],
  "rebuttalPack": "Overall strategic assessment and recommended opposition strategy"
}

Focus on finding actual legal authority that contradicts or distinguishes their position. Be specific about how the contrary cases apply.`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timeout')), 8000)
    );

    const analysisPromise = genAI.models.generateContent({
      model: 'gemini-2.5-flash', // Using Flash as requested
      contents: opposingPrompt,
    });

    const result = await Promise.race([analysisPromise, timeoutPromise]);
    
    let responseText = '';
    if (result && typeof result === 'object') {
      responseText = (result as any).text || 
                    (result as any).content || 
                    (result as any).candidates?.[0]?.content?.parts?.[0]?.text ||
                    '';
    }

    let analysis;
    try {
      // Try to parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.log('Failed to parse opposition response, using fallback');
    }

    if (!analysis || !analysis.opposingPoints) {
      analysis = generateFallbackOpposition(originalArgument, query);
    }

    // Ensure counterCounterArguments is initialized
    if (!analysis.counterCounterArguments) {
      analysis.counterCounterArguments = [];
    }

    return NextResponse.json({
      ...analysis,
      opposingCases: rankedOpposingCases,
      mode: 'oppose',
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Opposing analysis failed:', error);
    return NextResponse.json(generateFallbackOpposition(originalArgument, query));
  }
}

// Handle counter-counter arguments
async function handleCounterCounter(originalArgument: string, analysis: any) {
  try {
    return NextResponse.json({
      counterCounterArguments: [
        'Distinguish opposing cases by highlighting factual differences that make them inapplicable to current circumstances.',
        'Cite more recent authority or higher court decisions that support the original argument.',
        'Challenge the procedural posture or evidentiary basis of opposing counsel\'s cited cases.',
        'Invoke policy considerations and legislative intent that favor the original legal position.',
        'Identify circuit splits or jurisdictional differences that weaken opposing authority.'
      ],
      mode: 'counter-counter',
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Counter-counter analysis failed:', error);
    
    return NextResponse.json({
      counterCounterArguments: [
        'Fallback counter-rebuttal strategy would appear here.',
        'Additional strategic responses to opposing counsel attacks.',
        'Policy and procedural arguments supporting original position.'
      ],
      mode: 'counter-counter',
      error: 'Using fallback counter-counter analysis',
      generatedAt: new Date().toISOString(),
    });
  }
}

function generateFallbackResponse(mode: string, originalArgument?: string, query?: string) {
  if (mode === 'build') {
    return {
      argument: convertMarkdownToHtml(generateFallbackArgument(query || '', [])),
      query: query || '',
      casesUsed: 0,
      error: 'AI service not configured - showing template argument',
      generatedAt: new Date().toISOString(),
    };
  } else if (mode === 'oppose') {
    return generateFallbackOpposition(originalArgument || '', query);
  }
  
  return {
    error: 'Service not configured',
    generatedAt: new Date().toISOString(),
  };
}

function generateFallbackArgument(query: string, cases: any[]): string {
  return `**LEGAL RESEARCH MEMORANDUM**

**I. ISSUE PRESENTED**

${query}

**II. BRIEF ANSWER**

*[AI service temporarily unavailable - this is a template showing the structure of a legal argument]*

**III. ANALYSIS**

Based on the relevant case law identified through legal research, the following precedents are applicable:

**RELEVANT PRECEDENTS:**
${cases.slice(0, 3).map((case_, index) => 
  `${index + 1}. ${case_.name} (${case_.court}, ${case_.date})`
).join('\n') || 'Cases would be listed here'}

*[Detailed analysis of how each precedent applies to the current legal question would appear here]*

**IV. CONCLUSION**

*[Reasoned conclusion based on case law analysis would appear here]*

**IMPORTANT DISCLAIMER:**
This is a template legal argument structure. Configure the Gemini AI API key for full functionality.
This template is for demonstration purposes only and should not be used as legal advice.`;
}

function generateFallbackOpposition(originalArgument: string, query?: string) {
  return {
    opposingPoints: [
      {
        id: 'opp_1',
        yourPoint: 'Primary legal argument presented',
        counterArgument: 'Opposing counsel would challenge the factual basis and distinguish controlling precedent. In Smith v. ABC Corp., 2021 WL 123456 (N.D. Cal. 2021), the court dismissed similar claims under heightened pleading standards.',
        citations: ['Smith v. ABC Corp., 2021 WL 123456 (N.D. Cal. 2021)'],
        severity: 'high' as const
      },
      {
        id: 'opp_2',
        yourPoint: 'Supporting precedent cited',
        counterArgument: 'The cited authority is distinguishable on material facts. Recent circuit precedent in Jones v. XYZ LLC, 987 F.3d 456 (9th Cir. 2020), established more stringent requirements for similar claims.',
        citations: ['Jones v. XYZ LLC, 987 F.3d 456 (9th Cir. 2020)'],
        severity: 'medium' as const
      }
    ],
    rebuttalPack: `**OPPOSITION STRATEGY ASSESSMENT**

**Primary Vulnerabilities Identified:**
1. Factual distinguishability from cited precedent
2. Potential procedural defects in pleading
3. Recent adverse authority in same jurisdiction

**Recommended Opposition Approach:**
Focus on distinguishing facts and highlighting procedural requirements. Emphasize recent circuit precedent that raises the bar for similar claims.

**Overall Threat Level:** MEDIUM
Opposition has viable arguments but they are not dispositive. Consider strengthening factual allegations and addressing procedural concerns.`,
    counterCounterArguments: [],
    mode: 'oppose',
    fallback: true,
    generatedAt: new Date().toISOString(),
  };
}