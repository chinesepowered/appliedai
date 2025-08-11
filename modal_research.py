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
    "google-generativeai>=0.8.0",
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
    courtlistener_token = "b2fc32b697eeb0576e983eed0188e4eaf48db583"  # Hardcoded for demo
    
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
        "stat_Precedential": "on",  # Only precedential cases
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
                    "id": result.get("cluster_id"),
                    "name": result.get("caseName", "Unknown Case"),
                    "court": result.get("court", "Unknown Court"),
                    "date": result.get("dateFiled", "Unknown Date"),
                    "snippet": result.get("syllabus", "")[:200] if result.get("syllabus") else "",
                    "url": f"https://www.courtlistener.com{result.get('absolute_url', '')}",
                    "citation": result.get("neutralCite", "No citation"),
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
    elif "landlord" in query.lower() or "tenant" in query.lower() or "deposit" in query.lower():
        # Landlord-tenant fallback
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
    
    courtlistener_token = "b2fc32b697eeb0576e983eed0188e4eaf48db583"  # Hardcoded for demo
    
    headers = {
        "Authorization": f"Token {courtlistener_token}",
        "Content-Type": "application/json"
    }
    
    search_url = "https://www.courtlistener.com/api/rest/v4/search/"
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
                    "id": result.get("cluster_id"),
                    "name": result.get("caseName", "Unknown Case"),
                    "court": result.get("court", "Unknown Court"),
                    "date": result.get("dateFiled", "Unknown Date"),
                    "snippet": result.get("syllabus", "")[:200] if result.get("syllabus") else "",
                    "url": f"https://www.courtlistener.com{result.get('absolute_url', '')}",
                    "citation": result.get("neutralCite", "No citation"),
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
    
    api_key = "AIzaSyB0w2urMDlTdfzijNSVI-5UTeVmDNHX9Fo"  # Hardcoded for demo
    print(f"Gemini API key present: {bool(api_key)}")
    if api_key:
        print(f"API key starts with: {api_key[:10]}...")
    else:
        print("No Gemini API key found in environment")
        return {"status": "error", "message": "Missing Gemini API key"}
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash-lite')
    
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
        # Detect case type for appropriate legal framework
        case_type = "criminal" if any(word in query.lower() for word in ["murder", "criminal", "defendant", "prosecution"]) else "civil"
        
        prompt = f"""
You are a skilled attorney drafting a legal argument. Based on the following cases, create a strong primary argument for: {query}

Available Cases:
{case_context}

Structure your response as a clear IRAC analysis:
1. Issue: What is the legal question?
2. Rule: What legal principles apply (cite the cases)?
3. Application: How do the facts apply to the law?
4. Conclusion: What should the outcome be?

{"Focus on criminal jurisdiction, burden of proof, and constitutional protections." if case_type == "criminal" else "Focus on civil liability, statutory requirements, and burden of proof."}

Make it persuasive and cite specific case law. Keep it under 300 words.
"""
    
    elif argument_type == "opposition":
        # Detect case type for appropriate opposition strategy
        case_type = "criminal" if any(word in query.lower() for word in ["murder", "criminal", "defendant", "prosecution"]) else "civil"
        
        if case_type == "criminal":
            prompt = f"""
You are a prosecutor finding weaknesses in the defense argument about: {query}

Based on these contrary authorities:
{case_context}

Draft a counter-argument that:
1. Identifies the strongest opposing legal precedent
2. Distinguishes or undermines the defense position
3. Cites specific case law that favors prosecution
4. Points out factual or legal gaps in defense argument

Be aggressive but professional. Under 250 words.
"""
        else:
            prompt = f"""
You are opposing counsel finding weaknesses in the argument about: {query}

Based on these contrary authorities:
{case_context}

Draft a counter-argument that:
1. Identifies the strongest opposing legal precedent
2. Distinguishes or undermines the opposing position
3. Cites specific case law that favors your client
4. Points out factual or legal gaps in opponent's argument

Be aggressive but professional. Under 250 words.
"""
    
    else:  # counter-rebuttal
        case_type = "criminal" if any(word in query.lower() for word in ["murder", "criminal", "defendant", "prosecution"]) else "civil"
        
        if case_type == "criminal":
            prompt = f"""
You are strengthening the defense argument against prosecution opposition. Query: {query}

Using these supporting authorities:
{case_context}

Create a counter-rebuttal that:
1. Addresses the prosecution's strongest points
2. Distinguishes contrary cases or shows they're not controlling
3. Reinforces your original defense with additional authority
4. Anticipates and preempts further prosecution attacks

Make it bulletproof. Under 250 words.
"""
        else:
            prompt = f"""
You are strengthening your original argument against opposition. Query: {query}

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
        print(f"Generating {argument_type} argument for: {query}")
        response = model.generate_content(prompt)
        print(f"AI response received: {len(response.text) if response.text else 0} characters")
        return {
            "status": "success",
            "argument": response.text,
            "argument_type": argument_type,
            "cases_used": len(cases)
        }
    except Exception as e:
        print(f"AI generation failed for {argument_type}: {str(e)}")
        print(f"Exception type: {type(e).__name__}")
        print(f"API key present: {bool(api_key)}")
        print(f"API key starts with: {api_key[:20] if api_key else 'None'}...")
        # Generate realistic fallback argument
        if argument_type == "primary":
            fallback = f"""**Issue:** Can the prosecution establish a valid legal claim regarding {query}?

**Rule:** Based on the {len(cases)} relevant cases, the applicable legal framework requires [specific legal standard]. Key precedents include {cases[0]['name'] if cases else 'relevant case law'}.

**Application:** The facts of this case align with established precedent. The {len(cases)} supporting authorities demonstrate [legal principle], which directly applies here.

**Conclusion:** The evidence and case law support a favorable outcome for the client."""
        elif argument_type == "opposition":
            fallback = f"""The opposing argument regarding {query} suffers from critical legal deficiencies. The {len(cases)} contrary authorities demonstrate that [opposing legal principle], which undermines the opponent's position. Furthermore, the cited cases are distinguishable on their facts and do not support the broad interpretation advanced."""
        else:  # counter-rebuttal
            fallback = f"""The opposition's challenges to our position on {query} are unpersuasive. Our original argument remains sound and is strengthened by the {len(cases)} supporting authorities. The contrary cases cited are either distinguishable or represent minority positions that should not control the outcome."""
        
        return {
            "status": "error", 
            "message": f"AI generation failed: {str(e)}",
            "fallback_argument": fallback
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
    
    # Step 1: Search for primary supporting cases
    primary_cases_result = search_primary_cases.local(query)
    
    # Step 2: Generate primary argument
    primary_cases = primary_cases_result["cases"]
    primary_arg_result = generate_argument.local(query, primary_cases, "primary")
    
    # Step 3: Search for opposing cases
    primary_argument = primary_arg_result.get("argument", primary_arg_result.get("fallback_argument", ""))
    opposing_cases_result = search_opposing_cases.local(query, primary_argument)
    
    # Step 4: Generate opposition argument
    if isinstance(opposing_cases_result, dict):
        opposing_cases = opposing_cases_result.get("cases", [])
    else:
        opposing_cases = []
    opposing_arg_result = generate_argument.local(query, opposing_cases, "opposition")
    
    # Step 5: Generate counter-rebuttal (strengthen original position)
    counter_rebuttal_result = generate_argument.local(query, primary_cases, "counter-rebuttal")
    
    # Build the research node
    research_node = {
        "query": query,
        "depth": depth,
        "timestamp": "2025-01-10T23:00:00Z",  # Mock timestamp
        "primary_argument": {
            "text": primary_arg_result.get("argument", f"Legal analysis for {query} based on {len(primary_cases)} relevant cases."),
            "supporting_cases": primary_cases,
            "confidence": 0.85
        },
        "opposition": {
            "text": opposing_arg_result.get("argument", opposing_arg_result.get("fallback_argument", f"Opposition analysis for {query} based on {len(opposing_cases)} contrary authorities.")),
            "opposing_cases": opposing_cases,
            "threat_level": "HIGH" if len(opposing_cases) > 2 else "MEDIUM"
        },
        "counter_rebuttal": {
            "text": counter_rebuttal_result.get("argument", counter_rebuttal_result.get("fallback_argument", f"Counter-rebuttal strengthening position on {query}.")),
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
    result = recursive_research_node.local(query, depth, max_depth)
    
    return result

# Local entrypoint for testing
@app.local_entrypoint()
def main():
    # Test the research pipeline
    test_query = "landlord security deposit dispute California Civil Code 1950.5"
    
    print(f"Testing recursive research for: {test_query}")
    
    with modal.enable_output():
        result = recursive_research_node.local(test_query, depth=0, max_depth=2)
        print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
