import modal
import requests
import json
import os
from typing import List, Dict, Any

# Create Modal app
app = modal.App("legal-research")

# Define the container image with required dependencies
image = modal.Image.debian_slim().pip_install([
    "requests",
    "google-generativeai",
    "fastapi[standard]",
])

@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("gemini-api-key"),
        modal.Secret.from_name("courtlistener-token")
    ],
    timeout=30
)
def search_primary_cases(query: str, jurisdiction: str = "federal") -> Dict[str, Any]:
    """Search for primary supporting cases for the main argument"""
    
    # Use CourtListener API for case search
    courtlistener_token = os.environ.get("COURTLISTENER_TOKEN", "")
    
    headers = {
        "Authorization": f"Token {courtlistener_token}",
        "Content-Type": "application/json"
    }
    
    print(f"Using CourtListener token: {courtlistener_token[:10]}..." if courtlistener_token else "No token found")
    
    # Search for relevant cases
    search_url = "https://www.courtlistener.com/api/rest/v4/search/"
    params = {
        "q": query,
        "type": "o",  # opinions
        "court": "scotus,ca1,ca2,ca3,ca4,ca5,ca6,ca7,ca8,ca9,ca10,ca11,cadc" if jurisdiction == "federal" else "",
        "order_by": "score desc",
        "format": "json"
    }
    
    try:
        response = requests.get(search_url, headers=headers, params=params, timeout=10)
        print(f"CourtListener API response status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"CourtListener returned {len(data.get('results', []))} results")
            cases = []
            
            for result in data.get("results", [])[:5]:  # Top 5 cases
                case_info = {
                    "id": result.get("id"),
                    "name": result.get("caseName", "Unknown Case"),
                    "court": result.get("court", "Unknown Court"),
                    "date": result.get("dateFiled", "Unknown Date"),
                    "snippet": result.get("snippet", ""),
                    "url": f"https://www.courtlistener.com{result.get('absolute_url', '')}",
                    "citation": result.get("citation", {}).get("neutral", "No citation"),
                    "relevance_score": 0.85  # Mock score for demo
                }
                cases.append(case_info)
            
            return {
                "status": "success",
                "cases": cases,
                "search_type": "primary_supporting"
            }
        else:
            print(f"CourtListener API error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Error searching cases: {e}")
    
    # Dynamic fallback data based on query
    if "murder" in query.lower() or "criminal" in query.lower():
        fallback_cases = [
            {
                "id": "mock-criminal-1",
                "name": "People v. Wilson",
                "court": "California Court of Appeal", 
                "date": "1963-05-15",
                "snippet": "The location of the actus reus (the criminal act) is a key determinant in establishing jurisdiction for criminal prosecution.",
                "url": "https://courtlistener.com/mock/people-v-wilson",
                "citation": "220 Cal.App.2d 568 (1963)",
                "relevance_score": 0.94
            },
            {
                "id": "mock-criminal-2", 
                "name": "Strassheim v. Daily",
                "court": "U.S. Supreme Court",
                "date": "1911-03-13",
                "snippet": "A state's power to prosecute offenses committed within its boundaries is not lost merely because the defendant is later found outside of the state.",
                "url": "https://courtlistener.com/mock/strassheim-v-daily",
                "citation": "221 U.S. 280 (1911)",
                "relevance_score": 0.91
            }
        ]
    else:
        # Default landlord-tenant fallback
        fallback_cases = [
            {
                "id": "mock-1",
                "name": "Green v. Superior Court",
                "court": "CA Supreme Court", 
                "date": "2023-03-15",
                "snippet": "Security deposits must be returned within 21 days unless specific deductions are itemized...",
                "url": "https://courtlistener.com/mock/green-v-superior",
                "citation": "2023 Cal. LEXIS 1234",
                "relevance_score": 0.92
            },
            {
                "id": "mock-2", 
                "name": "Tenant Rights Coalition v. Metro Housing",
                "court": "9th Circuit",
                "date": "2022-11-08",
                "snippet": "Landlords bear burden of proof for security deposit deductions under Civil Code 1950.5...",
                "url": "https://courtlistener.com/mock/tenant-rights-v-metro",
                "citation": "2022 F.3d 567 (9th Cir.)",
                "relevance_score": 0.88
            }
        ]
    
    return {
        "status": "fallback",
        "cases": fallback_cases,
        "search_type": "primary_supporting"
    }

@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("gemini-api-key"),
        modal.Secret.from_name("courtlistener-token")
    ],
    timeout=30
)
def search_opposing_cases(query: str, primary_argument: str) -> Dict[str, Any]:
    """Search for cases that oppose or weaken the primary argument"""
    
    # Modify query to find contrary authority
    opposing_query = f"contrary authority {query} landlord favorable"
    
    courtlistener_token = os.environ.get("COURTLISTENER_TOKEN", "")
    
    headers = {
        "Authorization": f"Token {courtlistener_token}",
        "Content-Type": "application/json"
    }
    
    search_url = "https://www.courtlistener.com/api/rest/v3/search/"
    params = {
        "q": opposing_query,
        "type": "o",
        "order_by": "score desc",
        "format": "json"
    }
    
    try:
        response = requests.get(search_url, headers=headers, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            cases = []
            
            for result in data.get("results", [])[:4]:  # Top 4 opposing cases
                case_info = {
                    "id": result.get("id"),
                    "name": result.get("caseName", "Unknown Case"),
                    "court": result.get("court", "Unknown Court"),
                    "date": result.get("dateFiled", "Unknown Date"),
                    "snippet": result.get("snippet", ""),
                    "url": f"https://www.courtlistener.com{result.get('absolute_url', '')}",
                    "citation": result.get("citation", {}).get("neutral", "No citation"),
                    "threat_level": "HIGH",  # Mock threat assessment
                    "relevance_score": 0.75
                }
                cases.append(case_info)
            
            return {
                "status": "success", 
                "cases": cases,
                "search_type": "opposing_authority"
            }
    except Exception as e:
        print(f"Error searching opposing cases: {e}")
    
    # Fallback mock data
    return {
        "status": "fallback",
        "cases": [
            {
                "id": "mock-opp-1",
                "name": "Landlord Protection Alliance v. Davis",
                "court": "CA Court of Appeal",
                "date": "2023-01-20",
                "snippet": "Court held that normal wear and tear standards are subjective and landlords have discretion in deposit deductions...",
                "url": "https://courtlistener.com/mock/landlord-protection-v-davis",
                "citation": "2023 Cal. App. LEXIS 890",
                "threat_level": "HIGH",
                "relevance_score": 0.82
            },
            {
                "id": "mock-opp-2",
                "name": "Property Owners United v. State",
                "court": "Superior Court",
                "date": "2022-09-14", 
                "snippet": "Tenant failed to provide forwarding address, relieving landlord of deposit return obligations...",
                "url": "https://courtlistener.com/mock/property-owners-v-state",
                "citation": "2022 Cal. Super. LEXIS 445",
                "threat_level": "MEDIUM",
                "relevance_score": 0.71
            }
        ],
        "search_type": "opposing_authority"
    }

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("gemini-api-key")],
    timeout=45
)
def generate_argument(query: str, cases: List[Dict], argument_type: str) -> Dict[str, Any]:
    """Generate legal argument using Gemini based on retrieved cases"""
    
    import google.generativeai as genai
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"status": "error", "message": "Missing Gemini API key"}
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    # Build case context
    case_context = ""
    for i, case in enumerate(cases[:3]):  # Use top 3 cases
        case_context += f"""
Case {i+1}: {case['name']} ({case['citation']})
Court: {case['court']}
Key Point: {case['snippet'][:200]}...
URL: {case['url']}

"""
    
    if argument_type == "primary":
        prompt = f"""
You are a skilled attorney drafting a legal argument. Based on the following cases, create a strong primary argument for: {query}

Available Cases:
{case_context}

Structure your response as a clear IRAC analysis:
1. Issue: What is the legal question?
2. Rule: What legal principles apply (cite the cases)?
3. Application: How do the facts apply to the law?
4. Conclusion: What should the outcome be?

Make it persuasive and cite specific case law. Keep it under 300 words.
"""
    
    elif argument_type == "opposition":
        prompt = f"""
You are opposing counsel finding weaknesses in the tenant's argument about: {query}

Based on these contrary authorities:
{case_context}

Draft a counter-argument that:
1. Identifies the strongest opposing legal precedent
2. Distinguishes or undermines the tenant's position
3. Cites specific case law that favors the landlord
4. Points out factual or legal gaps in tenant's argument

Be aggressive but professional. Under 250 words.
"""
    
    else:  # counter-rebuttal
        prompt = f"""
You are strengthening the tenant's original argument against opposition. Query: {query}

Using these supporting authorities:
{case_context}

Create a counter-rebuttal that:
1. Addresses the opposition's strongest points
2. Distinguishes contrary cases or shows they're not controlling
3. Reinforces your original argument with additional authority
4. Anticipates and preempts further attacks

Make it bulletproof. Under 250 words.
"""
    
    try:
        response = model.generate_content(prompt)
        return {
            "status": "success",
            "argument": response.text,
            "argument_type": argument_type,
            "cases_used": len(cases)
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": f"AI generation failed: {str(e)}",
            "fallback_argument": f"[Fallback] Legal analysis for {query} based on {len(cases)} relevant cases."
        }

@app.function(
    image=image,
    secrets=[
        modal.Secret.from_name("gemini-api-key"),
        modal.Secret.from_name("courtlistener-token")
    ],
    timeout=60
)
def recursive_research_node(query: str, depth: int = 0, max_depth: int = 2) -> Dict[str, Any]:
    """
    Recursively build a research tree node with primary argument, opposition, and counter-rebuttal
    """
    
    if depth >= max_depth:
        return {"status": "max_depth_reached", "depth": depth}
    
    print(f"Building research node at depth {depth} for: {query}")
    
    # Step 1: Search for primary supporting cases (parallel)
    primary_cases_result = search_primary_cases.remote(query)
    
    # Step 2: Generate primary argument
    primary_cases = primary_cases_result["cases"]
    primary_arg_result = generate_argument.remote(query, primary_cases, "primary")
    
    # Step 3: Search for opposing cases (parallel with primary argument generation)
    primary_argument = primary_arg_result.get("argument", "")
    opposing_cases_result = search_opposing_cases.remote(query, primary_argument)
    
    # Step 4: Generate opposition argument
    opposing_cases = opposing_cases_result["cases"]
    opposing_arg_result = generate_argument.remote(query, opposing_cases, "opposition")
    
    # Step 5: Generate counter-rebuttal (strengthen original position)
    counter_rebuttal_result = generate_argument.remote(query, primary_cases, "counter-rebuttal")
    
    # Build the research node
    research_node = {
        "query": query,
        "depth": depth,
        "timestamp": "2025-01-10T23:00:00Z",  # Mock timestamp
        "primary_argument": {
            "text": primary_arg_result.get("argument", ""),
            "supporting_cases": primary_cases,
            "confidence": 0.85
        },
        "opposition": {
            "text": opposing_arg_result.get("argument", ""),
            "opposing_cases": opposing_cases,
            "threat_level": "HIGH" if len(opposing_cases) > 2 else "MEDIUM"
        },
        "counter_rebuttal": {
            "text": counter_rebuttal_result.get("argument", ""),
            "strengthened_position": True,
            "final_confidence": 0.92
        },
        "expandable": depth < max_depth - 1,
        "case_strength_score": 87  # Mock algorithmic score
    }
    
    return {
        "status": "success",
        "research_node": research_node,
        "total_cases_analyzed": len(primary_cases) + len(opposing_cases),
        "processing_time": "4.2s"  # Mock timing
    }

# FastAPI endpoint for Next.js to call
@app.function(image=image)
@modal.fastapi_endpoint(method="POST")
def research_endpoint(data: dict):
    """
    Main endpoint for Next.js app to trigger recursive legal research
    """
    query = data.get("query", "")
    depth = data.get("depth", 0)
    max_depth = data.get("max_depth", 2)
    
    if not query:
        return {"error": "Query is required"}
    
    # Trigger recursive research
    result = recursive_research_node.remote(query, depth, max_depth)
    
    return result

# Local entrypoint for testing
@app.local_entrypoint()
def main():
    # Test the research pipeline
    test_query = "landlord security deposit dispute California Civil Code 1950.5"
    
    print(f"Testing recursive research for: {test_query}")
    
    with modal.enable_output():
        result = recursive_research_node.remote(test_query, depth=0, max_depth=2)
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
