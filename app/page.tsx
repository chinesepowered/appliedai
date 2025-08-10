'use client';

import { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [argument, setArgument] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);

  // Function to escape HTML entities to prevent XSS
  const escapeHtml = (text: string) => {
    if (typeof window === 'undefined') {
      // Server-side fallback - basic HTML escaping
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Function to detect and link legal citations while preserving existing HTML formatting
  const linkLegalCitations = (text: string) => {
    // Check if text already contains HTML formatting (from backend)
    const containsHtml = /<\/?(strong|em|br|h1|h2|h3|li|ol|ul)>/i.test(text);
    
    let processedText;
    if (containsHtml) {
      // Text already contains HTML formatting from backend - preserve it
      processedText = text;
    } else {
      // Text is plain text - escape it for safety
      processedText = escapeHtml(text);
    }
    
    // Patterns for common legal citations
    const patterns = [
      // California Civil Code sections
      {
        regex: /California Civil Code (?:Section |§ |section )?(\d+(?:\.\d+)*)/gi,
        linkTemplate: (match: string, section: string) => 
          `<a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=${section}&lawCode=CIV" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${match}</a>`
      },
      // Generic Civil Code references  
      {
        regex: /Civil Code (?:Section |§ |section )?(\d+(?:\.\d+)*)/gi,
        linkTemplate: (match: string, section: string) => 
          `<a href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=${section}&lawCode=CIV" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${match}</a>`
      },
      // USC sections
      {
        regex: /(\d+) U\.?S\.?C\.? (?:§ |section )?(\d+(?:\([a-z]\))?)/gi,
        linkTemplate: (match: string, title: string, section: string) => 
          `<a href="https://www.law.cornell.edu/uscode/text/${title}/${section}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${match}</a>`
      },
      // Federal Rules of Civil Procedure
      {
        regex: /(?:Fed\.?|Federal) (?:R\.?|Rule) (?:Civ\.?|Civil) (?:P\.?|Proc\.?) (\d+(?:\([a-z]\d*\))?)/gi,
        linkTemplate: (match: string, rule: string) => 
          `<a href="https://www.law.cornell.edu/rules/frcp/rule_${rule}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${match}</a>`
      },
      // New York statutes
      {
        regex: /New York (?:Real Property Law|RPL) (?:§ |section )?(\d+(?:-[a-z])?)/gi,
        linkTemplate: (match: string, section: string) => 
          `<a href="https://www.nysenate.gov/legislation/laws/RPP/${section}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${match}</a>`
      },
    ];

    let linkedText = processedText;
    patterns.forEach(pattern => {
      linkedText = linkedText.replace(pattern.regex, pattern.linkTemplate);
    });

    return linkedText;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, jurisdiction }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.cases || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDraftArgument = async () => {
    if (results.length === 0) return;
    
    setIsDrafting(true);
    try {
      const response = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, cases: results }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setArgument(data.argument || '');
      }
    } catch (error) {
      console.error('Draft failed:', error);
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Legal Research Assistant
          </h1>
          <p className="text-lg text-gray-600">
            Find relevant case law and precedents with AI-powered analysis
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
          {/* Search Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Search Case Law
            </h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
                  Legal Question or Topic
                </label>
                <textarea
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., contract interpretation under force majeure clauses..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  rows={4}
                />
              </div>
              
              <div>
                <label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-700 mb-2">
                  Jurisdiction (Optional)
                </label>
                <select
                  id="jurisdiction"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="" className="text-gray-900">All Jurisdictions</option>
                  <option value="supreme-court" className="text-gray-900">US Supreme Court</option>
                  <option value="federal-circuit" className="text-gray-900">Federal Circuit Courts</option>
                  <option value="ca" className="text-gray-900">California</option>
                  <option value="ny" className="text-gray-900">New York</option>
                  <option value="tx" className="text-gray-900">Texas</option>
                  <option value="fl" className="text-gray-900">Florida</option>
                </select>
              </div>
              
              <button
                onClick={handleSearch}
                disabled={isSearching || !query.trim()}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {isSearching ? 'Searching...' : 'Search Precedents'}
              </button>
            </div>
            
            {/* Search Results */}
            {results.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">
                  Relevant Cases ({results.length})
                </h3>
                <div className="space-y-3 max-h-80 lg:max-h-96 overflow-y-auto">
                  {results.map((case_, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-3">
                      <h4 className="font-medium text-blue-800">
                        {case_.name || case_.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {case_.court} • {case_.date}
                        {case_.source && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {case_.source}
                          </span>
                        )}
                      </p>
                      {case_.snippet && (
                        <p className="text-sm text-gray-700 mt-2 line-clamp-3">
                          {case_.snippet}
                        </p>
                      )}
                      {case_.url && (
                        <a
                          href={case_.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
                        >
                          View Full Case →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={handleDraftArgument}
                  disabled={isDrafting}
                  className="w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                >
                  {isDrafting ? 'Drafting Argument...' : 'Draft Legal Argument'}
                </button>
              </div>
            )}
          </div>

          {/* Argument Panel */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              AI-Generated Argument
            </h2>
            
            {argument ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <strong>Disclaimer:</strong> This is a draft argument generated by AI. 
                        Please review and verify all citations and legal reasoning before use.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="prose max-w-none">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div 
                      className="font-sans text-sm leading-relaxed text-gray-900"
                      dangerouslySetInnerHTML={{ __html: linkLegalCitations(argument) }}
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => navigator.clipboard.writeText(argument)}
                  className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium"
                >
                  Copy to Clipboard
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A10.003 10.003 0 0124 26c4.21 0 7.813 2.602 9.288 6.286" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No argument yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Search for cases first, then click "Draft Legal Argument" to generate an AI-powered argument.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}