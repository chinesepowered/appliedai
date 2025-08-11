import { NextRequest, NextResponse } from 'next/server';

interface ResearchRequest {
  query: string;
  depth?: number;
  max_depth?: number;
  mode?: 'build_tree' | 'expand_node';
  node_id?: string;
}

interface ResearchNode {
  query: string;
  depth: number;
  timestamp: string;
  primary_argument: {
    text: string;
    supporting_cases: Array<{
      id: string;
      name: string;
      court: string;
      date: string;
      snippet: string;
      url: string;
      citation: string;
      relevance_score: number;
    }>;
    confidence: number;
  };
  opposition: {
    text: string;
    opposing_cases: Array<{
      id: string;
      name: string;
      court: string;
      date: string;
      snippet: string;
      url: string;
      citation: string;
      threat_level: string;
      relevance_score: number;
    }>;
    threat_level: string;
  };
  counter_rebuttal: {
    text: string;
    strengthened_position: boolean;
    final_confidence: number;
  };
  expandable: boolean;
  case_strength_score: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResearchRequest = await request.json();
    const { query, depth = 0, max_depth = 2, mode = 'build_tree' } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Get Modal credentials from environment
    const modalTokenId = process.env.MODAL_TOKEN_ID;
    const modalTokenSecret = process.env.MODAL_TOKEN_SECRET;

    if (!modalTokenId || !modalTokenSecret) {
      console.log('Modal credentials missing, using fallback data');
      const fallbackData = getFallbackResearchTree(query, depth);
      fallbackData.status = 'demo_mode';
      fallbackData.note = 'Using demo data - Deploy Modal functions for full functionality';
      return NextResponse.json(fallbackData);
    }

    try {
      // Call real Modal endpoint
      const modalEndpoint = 'https://hitarth2004--legal-research-research-endpoint.modal.run';
      
      const modalResponse = await fetch(modalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          depth,
          max_depth
        }),
      });

      if (!modalResponse.ok) {
        throw new Error(`Modal API error: ${modalResponse.status}`);
      }

      const data = await modalResponse.json();
      return NextResponse.json(data);

    } catch (modalError) {
      console.error('Modal API call failed:', modalError);
      return NextResponse.json(getFallbackResearchTree(query, depth));
    }

  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simulate Modal response for demo purposes
async function simulateModalCall(query: string, depth: number, max_depth: number) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

  const researchNode: ResearchNode = {
    query,
    depth,
    timestamp: new Date().toISOString(),
    primary_argument: {
      text: `Based on California Civil Code § 1950.5, landlords must return security deposits within 21 days of tenant move-out, along with an itemized statement of any deductions. The burden of proof lies with the landlord to justify any deductions beyond normal wear and tear. In Green v. Superior Court (2023), the California Supreme Court reinforced that security deposit laws are strictly construed in favor of tenants, and any ambiguity in deduction justification must be resolved against the landlord.`,
      supporting_cases: [
        {
          id: 'cl-primary-1',
          name: 'Green v. Superior Court',
          court: 'California Supreme Court',
          date: '2023-03-15',
          snippet: 'Security deposits must be returned within 21 days unless specific deductions are itemized with receipts and justification...',
          url: 'https://courtlistener.com/opinion/green-v-superior',
          citation: '2023 Cal. LEXIS 1234',
          relevance_score: 0.92
        },
        {
          id: 'cl-primary-2',
          name: 'Tenant Rights Coalition v. Metro Housing',
          court: '9th Circuit Court of Appeals',
          date: '2022-11-08',
          snippet: 'Landlords bear burden of proof for security deposit deductions under Civil Code 1950.5, particularly for damage beyond normal wear...',
          url: 'https://courtlistener.com/opinion/tenant-rights-v-metro',
          citation: '2022 F.3d 567 (9th Cir.)',
          relevance_score: 0.88
        },
        {
          id: 'cl-primary-3',
          name: 'Martinez v. Sunset Properties',
          court: 'California Court of Appeal',
          date: '2023-07-22',
          snippet: 'Failure to provide itemized deduction statement within statutory timeframe results in forfeiture of landlord\'s right to retain deposit...',
          url: 'https://courtlistener.com/opinion/martinez-v-sunset',
          citation: '2023 Cal. App. 4th 890',
          relevance_score: 0.85
        }
      ],
      confidence: 0.89
    },
    opposition: {
      text: `However, landlords retain significant discretion in determining what constitutes damage beyond normal wear and tear. In Landlord Protection Alliance v. Davis (2023), the Court of Appeal held that subjective standards for cleanliness and maintenance give landlords reasonable latitude in deposit deductions. Additionally, tenant failure to provide proper forwarding address can relieve landlords of strict compliance with return timelines, as established in Property Owners United v. State (2022).`,
      opposing_cases: [
        {
          id: 'cl-oppose-1',
          name: 'Landlord Protection Alliance v. Davis',
          court: 'California Court of Appeal',
          date: '2023-01-20',
          snippet: 'Normal wear and tear standards are inherently subjective, and landlords have reasonable discretion in determining maintenance standards...',
          url: 'https://courtlistener.com/opinion/landlord-protection-v-davis',
          citation: '2023 Cal. App. LEXIS 890',
          threat_level: 'HIGH',
          relevance_score: 0.82
        },
        {
          id: 'cl-oppose-2',
          name: 'Property Owners United v. State',
          court: 'Superior Court of California',
          date: '2022-09-14',
          snippet: 'Tenant failure to provide valid forwarding address relieves landlord of deposit return obligations under Civil Code 1950.5(g)...',
          url: 'https://courtlistener.com/opinion/property-owners-v-state',
          citation: '2022 Cal. Super. LEXIS 445',
          threat_level: 'MEDIUM',
          relevance_score: 0.71
        }
      ],
      threat_level: 'HIGH'
    },
    counter_rebuttal: {
      text: `The opposition's reliance on subjective standards fails under strict statutory construction. Green v. Superior Court explicitly rejected landlord discretion arguments, holding that Civil Code 1950.5 creates objective standards enforceable through small claims court. The forwarding address requirement in Property Owners is distinguishable - it applies only when tenant actively conceals their location, not mere technical non-compliance. Martinez v. Sunset Properties confirms that statutory compliance is mandatory regardless of landlord's subjective judgment about damage.`,
      strengthened_position: true,
      final_confidence: 0.94
    },
    expandable: depth < max_depth - 1,
    case_strength_score: 87
  };

  return {
    status: 'success',
    research_node: researchNode,
    total_cases_analyzed: researchNode.primary_argument.supporting_cases.length + researchNode.opposition.opposing_cases.length,
    processing_time: '4.2s',
    modal_functions_executed: 5
  };
}

// Fallback data when Modal is unavailable
function getFallbackResearchTree(query: string, depth: number) {
  return {
    status: 'fallback',
    research_node: {
      query,
      depth,
      timestamp: new Date().toISOString(),
      primary_argument: {
        text: `[Fallback Analysis] Based on standard legal principles for: ${query}. This would normally be generated by our Modal-powered research engine with real case law from CourtListener and other legal databases.`,
        supporting_cases: [
          {
            id: 'fallback-1',
            name: 'Sample v. Case',
            court: 'Demo Court',
            date: '2023-01-01',
            snippet: 'This is fallback data when Modal services are unavailable...',
            url: '#',
            citation: 'Demo Citation',
            relevance_score: 0.5
          }
        ],
        confidence: 0.5
      },
      opposition: {
        text: `[Fallback Opposition] Counter-arguments would be generated here using our adversarial AI system.`,
        opposing_cases: [],
        threat_level: 'UNKNOWN'
      },
      counter_rebuttal: {
        text: `[Fallback Rebuttal] Strengthened argument would appear here.`,
        strengthened_position: false,
        final_confidence: 0.5
      },
      expandable: false,
      case_strength_score: 50
    },
    total_cases_analyzed: 1,
    processing_time: '0.1s',
    note: 'Using fallback data - Modal integration required for full functionality'
  };
}
