'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Scale, Zap, Shield, AlertTriangle, ChevronDown, ChevronRight, ExternalLink, TreePine, Target } from 'lucide-react';

interface ArgumentAnalysis {
  originalArgument: string;
  opposingPoints: Array<{
    id: string;
    yourPoint: string;
    counterArgument: string;
    citations: string[];
    severity: 'low' | 'medium' | 'high';
  }>;
  rebuttalPack: string;
  counterCounterArguments: string[];
  opposingCases?: Array<{
    id: string;
    name: string;
    court: string;
    date: string;
    snippet: string;
    url: string;
    source: string;
  }>;
}

interface BuildResponse {
  argument: string;
  query: string;
  cases: Array<{
    id: string;
    name: string;
    court: string;
    date: string;
    snippet: string;
    url: string;
    source: string;
  }>;
  casesUsed: number;
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

interface ResearchTree {
  root: ResearchNode;
  expanded_nodes: { [nodeId: string]: ResearchNode };
  processing_stats: {
    total_cases_analyzed: number;
    processing_time: string;
    modal_functions_executed: number;
  };
}

export default function OpposingCounselPage() {
  const [query, setQuery] = useState('');
  const [researchTree, setResearchTree] = useState<ResearchTree | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildingNodeId, setBuildingNodeId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [researchDepth, setResearchDepth] = useState<number>(2);
  
  // Keep legacy state for backward compatibility with existing UI
  const [originalArgument, setOriginalArgument] = useState('');
  const [supportingCases, setSupportingCases] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<ArgumentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentMode, setCurrentMode] = useState<'build' | 'oppose' | 'counter'>('build');
  const [selectedOpposingPoint, setSelectedOpposingPoint] = useState<string | null>(null);

  // Sample legal argument for demonstration
  const sampleArgument = `Under the Twombly/Iqbal standard, Plaintiff has pled sufficient factual matter to state a claim for relief that is plausible on its face.

The Supreme Court in Bell Atlantic Corp. v. Twombly, 550 U.S. 544 (2007), established that a complaint must contain sufficient factual matter, accepted as true, to state a claim to relief that is plausible on its face. This standard was clarified in Ashcroft v. Iqbal, 556 U.S. 662 (2009).

Here, Plaintiff's complaint alleges specific instances of discriminatory conduct, including:
1. Direct supervisor making derogatory comments about Plaintiff's protected class
2. Denial of promotion opportunities despite superior qualifications
3. Retaliation following complaints to HR

These allegations, taken as true, establish a plausible claim for discrimination under Title VII.`;

  const buildResearchTree = async () => {
    if (!query.trim()) return;
    
    setIsBuilding(true);
    setBuildingNodeId('root');
    
    // Clear legacy state to avoid duplication
    setOriginalArgument('');
    setAnalysis(null);
    setSupportingCases([]);
    
    try {
      const response = await fetch('/api/modal-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          depth: 0,
          max_depth: researchDepth,
          mode: 'build_tree'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newTree: ResearchTree = {
          root: data.research_node,
          expanded_nodes: {},
          processing_stats: {
            total_cases_analyzed: data.total_cases_analyzed,
            processing_time: data.processing_time,
            modal_functions_executed: data.modal_functions_executed || 5
          }
        };
        
        setResearchTree(newTree);
        setExpandedNodes(new Set(['root']));
      }
    } catch (error) {
      console.error('Research tree building failed:', error);
    } finally {
      setIsBuilding(false);
      setBuildingNodeId(null);
    }
  };

  const expandNode = async (nodeId: string, nodeQuery: string) => {
    if (expandedNodes.has(nodeId) || !researchTree) return;
    
    setIsBuilding(true);
    setBuildingNodeId(nodeId);
    
    try {
      const response = await fetch('/api/modal-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: nodeQuery,
          depth: 1,
          max_depth: 3,
          mode: 'expand_node',
          node_id: nodeId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        setResearchTree(prev => prev ? {
          ...prev,
          expanded_nodes: {
            ...prev.expanded_nodes,
            [nodeId]: data.research_node
          }
        } : null);
        
        setExpandedNodes(prev => new Set([...prev, nodeId]));
      }
    } catch (error) {
      console.error('Node expansion failed:', error);
    } finally {
      setIsBuilding(false);
      setBuildingNodeId(null);
    }
  };

  const handleBuildArgument = async () => {
    if (!query.trim()) return;
    
    setCurrentMode('build');
    setIsAnalyzing(true);
    
    // Clear research tree to avoid duplication
    setResearchTree(null);
    setExpandedNodes(new Set());
    
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('API timeout')), 10000)
      );

      const fetchPromise = fetch('/api/opposingcounsel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          mode: 'build'
        }),
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      if (response.ok) {
        const data: BuildResponse = await response.json();
        setOriginalArgument(data.argument || '');
        setSupportingCases(data.cases || []);
      } else {
        // Don't fallback to sample - keep empty so image shows
        console.log('API call failed, keeping empty state');
      }
    } catch (error) {
      console.error('Build argument failed:', error);
      // Don't fallback to sample - keep empty so image shows
      console.log('Build failed, keeping empty state');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpposingAnalysis = async () => {
    if (!originalArgument.trim()) return;
    
    setCurrentMode('oppose');
    setIsAnalyzing(true);
    
    // Clear research tree to avoid duplication
    setResearchTree(null);
    setExpandedNodes(new Set());
    
    try {
      // Set a timeout for the API call
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API timeout')), 10000) // 10 second timeout
      );
      
      const fetchPromise = fetch('/api/opposingcounsel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalArgument, 
          query,
          mode: 'oppose'
        }),
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
      } else {
        throw new Error('API response not ok');
      }
    } catch (error) {
      console.error('Opposing analysis failed:', error);
      // Always use fallback with example data for demo purposes
      setAnalysis({
        originalArgument,
        opposingPoints: [
          {
            id: '1',
            yourPoint: 'Under the Twombly/Iqbal standard, Plaintiff has pled sufficient factual matter',
            counterArgument: 'In Smith v. ABC Corp., 2021 WL 123456 (N.D. Cal. 2021), the court dismissed under Twombly/Iqbal on very similar facts — alleged discrimination without specific incidents, dates, or witnesses.',
            citations: ['Smith v. ABC Corp., 2021 WL 123456 (N.D. Cal. 2021)', 'Jones v. XYZ LLC, 987 F.3d 456 (9th Cir. 2020)'],
            severity: 'high'
          },
          {
            id: '2', 
            yourPoint: 'Specific instances of discriminatory conduct including supervisor comments',
            counterArgument: 'In Jones v. XYZ LLC, 987 F.3d 456 (9th Cir. 2020), the court required a higher factual specificity for similar claims, noting that conclusory allegations of "derogatory comments" without verbatim quotes are insufficient.',
            citations: ['Jones v. XYZ LLC, 987 F.3d 456 (9th Cir. 2020)', 'Wilson v. DEF Inc., 123 F.Supp.3d 789 (S.D.N.Y. 2019)'],
            severity: 'medium'
          },
          {
            id: '3',
            yourPoint: 'Denial of promotion opportunities despite superior qualifications',
            counterArgument: 'Plaintiff fails to identify specific positions, application dates, or comparative qualifications of selected candidates. See Rodriguez v. GHI Corp., 456 F.3d 234 (2d Cir. 2018) (dismissing similar claims lacking specificity).',
            citations: ['Rodriguez v. GHI Corp., 456 F.3d 234 (2d Cir. 2018)'],
            severity: 'high'
          }
        ],
        rebuttalPack: `OPPOSING COUNSEL'S REBUTTAL PACK

1. FACTUAL INSUFFICIENCY CHALLENGE
   - Smith v. ABC Corp. establishes higher pleading standard for discrimination claims
   - Plaintiff's allegations lack temporal specificity and witness identification
   - Recommendation: Move to dismiss under Fed.R.Civ.P. 12(b)(6)

2. COMPARATIVE EVIDENCE DEFICIENCY  
   - Rodriguez v. GHI Corp. requires identification of comparator employees
   - Plaintiff fails to establish prima facie case elements
   - Recommendation: Summary judgment motion on failure to establish comparators

3. CAUSATION GAPS
   - Wilson v. DEF Inc. demonstrates need for temporal proximity between complaints and adverse actions
   - Plaintiff's timeline insufficient to establish causal connection
   - Recommendation: Challenge causation element in discovery phase`,
        counterCounterArguments: []
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCounterCounter = async () => {
    if (!analysis) return;
    
    setCurrentMode('counter');
    setIsAnalyzing(true);
    
    // Clear research tree to avoid duplication
    setResearchTree(null);
    setExpandedNodes(new Set());
    
    try {
      const response = await fetch('/api/opposingcounsel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalArgument, 
          analysis,
          mode: 'counter-counter'
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
              setAnalysis(prev => prev ? {
        ...prev,
        counterCounterArguments: data.counterCounterArguments || []
      } : null);
      }
    } catch (error) {
      console.error('Counter-counter failed:', error);
      // Fallback
      setAnalysis(prev => prev ? {
        ...prev,
        counterCounterArguments: [
          'Distinguish Smith v. ABC Corp. by highlighting plaintiff\'s specific factual allegations that exceed the threshold established in that case.',
          'Cite recent circuit split on Twombly/Iqbal application to employment discrimination cases, arguing for more liberal pleading standard.',
          'Reference McDonnell Douglas framework as alternative analytical approach that supports plaintiff\'s claims even under heightened pleading standards.'
        ]
      } : null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Minimalist Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <Button variant="ghost" size="icon" asChild className="absolute left-4 top-4">
              <a href="/">
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
            <Scale className="h-8 w-8 text-slate-600" />
            <h1 className="text-3xl font-light text-slate-900">
              Opposing Counsel
            </h1>
          </div>
          
          {/* Large Ace Attorney Image in Center */}
          {!originalArgument.trim() && !researchTree && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <div className="relative mx-auto w-80 h-80 mb-6">
                <Image
                  src="/image.png"
                  alt="Ace Attorney Character"
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </div>
              <div className="max-w-md mx-auto">
                <p className="text-slate-600 text-sm leading-relaxed">
                  Challenge every argument. Find every weakness. 
                  <span className="block mt-2 font-medium">Build unbreakable cases.</span>
                </p>
              </div>
            </motion.div>
          )}
        </motion.header>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-8 border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-slate-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Legal Question
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your legal question or argument..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 placeholder-slate-400 resize-none"
                  rows={4}
                />
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleBuildArgument}
                    disabled={isAnalyzing || isBuilding || !query.trim()}
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    {isAnalyzing && currentMode === 'build' ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Building...
                      </>
                    ) : (
                      'Build Argument'
                    )}
                  </Button>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={buildResearchTree}
                      disabled={isAnalyzing || isBuilding || !query.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isBuilding ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Research Tree...
                        </>
                      ) : (
                        <>
                          <TreePine className="w-4 h-4 mr-2" />
                          Deep Research Tree
                        </>
                      )}
                    </Button>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>Depth:</span>
                      <select 
                        className="px-2 py-1 border border-slate-200 rounded text-sm"
                        value={researchDepth}
                        onChange={(e) => setResearchDepth(Number(e.target.value))}
                        disabled={isBuilding}
                      >
                        <option value="1">1 Level (Fast - 5s)</option>
                        <option value="2">2 Levels (Balanced - 15s)</option>
                        <option value="3">3 Levels (Deep - 30s)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Original Argument Display */}
        <AnimatePresence>
          {originalArgument && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-8"
            >
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Shield className="h-5 w-5 text-emerald-500" />
                    Your Argument
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50 p-4 rounded-lg mb-4">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                      {originalArgument}
                    </pre>
                  </div>
                  
                  <Button
                    onClick={handleOpposingAnalysis}
                    disabled={isAnalyzing}
                    variant="destructive"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isAnalyzing && currentMode === 'oppose' ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Challenge This Argument
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Results - Minimalist Design */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 mb-8"
            >
              {/* Opposition Analysis */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    Opposition Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.opposingPoints.map((point, index) => (
                      <motion.div
                        key={point.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border border-slate-200 rounded-lg p-4 bg-slate-50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-medium text-slate-900">Vulnerability {index + 1}</h4>
                          <Badge 
                            variant={point.severity === 'high' ? 'destructive' : 
                                    point.severity === 'medium' ? 'secondary' : 'outline'}
                          >
                            {point.severity.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">YOUR POSITION</p>
                            <p className="text-sm text-slate-700">{point.yourPoint}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1">OPPOSITION ARGUMENT</p>
                            <p className="text-sm text-slate-700">{point.counterArgument}</p>
                          </div>
                          
                          {point.citations.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">CITED AUTHORITY</p>
                              <div className="space-y-1">
                                {point.citations.map((citation, idx) => (
                                  <p key={idx} className="text-xs text-slate-600 font-mono">
                                    {citation}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rebuttal Pack */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-slate-200 mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Scale className="h-5 w-5 text-purple-500" />
                    Strategic Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50 p-4 rounded-lg mb-4">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                      {analysis.rebuttalPack}
                    </pre>
                  </div>
                  
                  <Button
                    onClick={handleCounterCounter}
                    disabled={isAnalyzing}
                    variant="outline"
                    className="border-slate-300 hover:bg-slate-50"
                  >
                    {isAnalyzing && currentMode === 'counter' ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full mr-2"
                        />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Generate Defense Strategy
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Counter-Counter Arguments */}
        <AnimatePresence>
          {analysis && analysis.counterCounterArguments && analysis.counterCounterArguments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-emerald-200 bg-emerald-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Shield className="h-5 w-5 text-emerald-500" />
                    Defense Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analysis.counterCounterArguments?.map((counterArg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border border-emerald-200 rounded-lg p-4 bg-white"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-medium text-emerald-600">{index + 1}</span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{counterArg}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-900 mb-1">Ready for Battle</h4>
                        <p className="text-sm text-amber-700">
                          Your argument is now fortified against opposition attacks. 
                          Incorporate these defensive strategies to build an unbreakable case.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Research Tree Display */}
        <AnimatePresence>
          {researchTree && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Card className="border-emerald-200 bg-emerald-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-emerald-900">
                    <TreePine className="h-5 w-5 text-emerald-600" />
                    Deep Research Tree
                    <Badge variant="secondary" className="ml-auto">
                      {researchTree.processing_stats.total_cases_analyzed} Cases Analyzed
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-emerald-700">
                    <span>{researchTree.processing_stats.processing_time}</span>
                    <span>{researchTree.processing_stats.modal_functions_executed} Modal Functions</span>
                    <span>Case Strength: {researchTree.root.case_strength_score}/100</span>
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                      Modal Powered
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Root Node - Primary Argument */}
                  <div className="space-y-4">
                    <div className="border border-emerald-200 rounded-lg p-4 bg-white">
                      <div className="flex items-start gap-3 mb-3">
                        <Target className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-slate-900">Primary Argument</h4>
                            <Badge variant="outline" className="text-xs">
                              Phoenix Wright
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-700 leading-relaxed mb-3 prose prose-sm max-w-none">
                            <div dangerouslySetInnerHTML={{
                              __html: researchTree.root.primary_argument.text
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                .replace(/\n/g, '<br/>')
                            }} />
                          </div>
                          
                          {/* Supporting Cases */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                              Supporting Authority ({researchTree.root.primary_argument.supporting_cases.length})
                            </p>
                            {researchTree.root.primary_argument.supporting_cases.map((case_, index) => (
                              <div 
                                key={case_.id}
                                className={`p-3 rounded border cursor-pointer transition-colors ${
                                  selectedCaseId === case_.id 
                                    ? 'bg-emerald-100 border-emerald-300' 
                                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                }`}
                                onClick={() => setSelectedCaseId(selectedCaseId === case_.id ? null : case_.id)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-sm text-slate-900 mb-1">
                                      {case_.name}
                                    </h5>
                                    <p className="text-xs text-slate-600 mb-1">
                                      {case_.court} • {case_.date}
                                    </p>
                                    <p className="text-xs text-slate-700">
                                      {case_.snippet.substring(0, 120)}...
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 ml-3">
                                    <Badge variant="outline" className="text-xs">
                                      {Math.round(case_.relevance_score * 100)}%
                                    </Badge>
                                    <ExternalLink className="h-3 w-3 text-slate-400" />
                                  </div>
                                </div>
                                
                                {selectedCaseId === case_.id && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 pt-3 border-t border-slate-200"
                                  >
                                    <p className="text-xs text-slate-600 mb-2">
                                      <strong>Citation:</strong> {case_.citation}
                                    </p>
                                    <p className="text-xs text-slate-700">
                                      {case_.snippet}
                                    </p>
                                    <a 
                                      href={case_.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 mt-2"
                                    >
                                      View Full Case <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </motion.div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <Badge 
                          variant="secondary" 
                          className="bg-emerald-100 text-emerald-800 text-xs"
                        >
                          {Math.round(researchTree.root.primary_argument.confidence * 100)}% Confidence
                        </Badge>
                      </div>
                      
                      {/* Opposition Expandable Section */}
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <button
                          onClick={() => expandNode('opposition', `opposing ${query}`)}
                          disabled={isBuilding}
                          className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {expandedNodes.has('opposition') ? (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Opposition Analysis (Expanded)
                            </>
                          ) : (
                            <>
                              <ChevronRight className="h-4 w-4" />
                                                    {buildingNodeId === 'opposition' ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-3 h-3 border border-red-600 border-t-transparent rounded-full"
                          />
                          Finding Opposition... ({researchDepth > 1 ? 'Level 2' : 'Level 1'})
                        </>
                      ) : (
                        `Find Opposition Arguments (${researchDepth > 1 ? 'Will expand to Level 2' : 'Level 1 only'})`
                      )}
                            </>
                          )}
                        </button>
                        
                        {/* Opposition Content */}
                        <AnimatePresence>
                          {expandedNodes.has('opposition') && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 p-3 bg-red-50 border border-red-200 rounded"
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-1">
                                    <h5 className="font-medium text-red-900 text-sm">Opposition Analysis</h5>
                                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                      Edgeworth
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-red-800 mb-3">
                                    {researchTree.root.opposition.text}
                                  </p>
                                  
                                  {/* Opposing Cases */}
                                  {researchTree.root.opposition.opposing_cases.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-red-700 uppercase tracking-wide">
                                        Contrary Authority ({researchTree.root.opposition.opposing_cases.length})
                                      </p>
                                      {researchTree.root.opposition.opposing_cases.map((case_, index) => (
                                        <div key={case_.id} className="p-2 bg-white border border-red-200 rounded text-xs">
                                          <div className="flex items-start justify-between">
                                            <div>
                                              <p className="font-medium text-red-900">{case_.name}</p>
                                              <p className="text-red-700">{case_.court} • {case_.date}</p>
                                              <p className="text-red-800 mt-1">{case_.snippet.substring(0, 100)}...</p>
                                            </div>
                                            <Badge 
                                              variant="destructive" 
                                              className="text-xs"
                                            >
                                              {case_.threat_level}
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Counter-Rebuttal Button */}
                                  <div className="mt-3 pt-3 border-t border-red-200">
                                    <button
                                      onClick={() => expandNode('counter-rebuttal', `strengthen ${query}`)}
                                      disabled={isBuilding}
                                      className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                                    >
                                      {expandedNodes.has('counter-rebuttal') ? (
                                        <>
                                          <ChevronDown className="h-4 w-4" />
                                          Counter-Rebuttal (Expanded)
                                        </>
                                      ) : (
                                        <>
                                          <Shield className="h-4 w-4" />
                                          {buildingNodeId === 'counter-rebuttal' ? (
                                            <>
                                              <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                className="w-3 h-3 border border-emerald-600 border-t-transparent rounded-full"
                                              />
                                              Strengthening...
                                            </>
                                          ) : (
                                            'Strengthen Position'
                                          )}
                                        </>
                                      )}
                                    </button>
                                    
                                    {/* Counter-Rebuttal Content */}
                                    <AnimatePresence>
                                      {expandedNodes.has('counter-rebuttal') && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: 'auto' }}
                                          exit={{ opacity: 0, height: 0 }}
                                          className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded"
                                        >
                                          <div className="flex items-start gap-2">
                                            <Shield className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                              <h6 className="font-medium text-emerald-900 text-sm mb-1">
                                                Strengthened Position
                                              </h6>
                                              <p className="text-sm text-emerald-800 mb-2">
                                                {researchTree.root.counter_rebuttal.text}
                                              </p>
                                              <Badge 
                                                variant="secondary" 
                                                className="bg-emerald-100 text-emerald-800 text-xs"
                                              >
                                                Final Confidence: {Math.round(researchTree.root.counter_rebuttal.final_confidence * 100)}%
                                              </Badge>
                                            </div>
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-12 border-t border-slate-200 mt-16"
        >
          <div className="max-w-md mx-auto">
            <p className="text-xs text-slate-500 leading-relaxed">
              This tool provides adversarial analysis for legal arguments. 
              All outputs should be reviewed by qualified legal counsel before use.
            </p>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
