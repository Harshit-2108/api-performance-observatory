const axios = require('axios');

// Deterministic rules-based SRE compiler (fallback if Gemini API Key is missing or request fails)
const compileSlaFallbackAnalysis = (incident, monitor) => {
  const msg = (incident.message || '').toLowerCase();
  
  let rootCause = 'Intermittent network path drop or server process deadlock.';
  let performanceExplanation = 'The service encountered unexpected connection response failures. Latency history shows standard variance spikes prior to the downtime window.';
  let recommendations = [
    'Inspect system CPU load statistics and memory allocations profiles.',
    'Establish redundant multi-region agent check nodes.',
    'Review network routing packet losses and CDN cache configuration.'
  ];

  if (msg.includes('503') || msg.includes('service unavailable')) {
    rootCause = 'Upstream database connection exhaustion or gateway server congestion.';
    performanceExplanation = 'The API gateway returned an HTTP 503 Service Unavailable code. Recent latency indexes show a spike immediately prior to check failures, pointing to system thread lock issues.';
    recommendations = [
      'Scale backend container replicas using horizontal autoscaling parameters.',
      'Configure client-side exponential backoff retry algorithms.',
      'Audit database thread pool sizes and optimize connection limits.'
    ];
  } else if (msg.includes('timeout') || msg.includes('504') || msg.includes('exceeding')) {
    rootCause = 'Server-side execution timeout or database query lock contention.';
    performanceExplanation = 'The agent check request exceeded the configured socket timeout. This pattern typically suggests a thread deadlock, an unindexed database query, or an unhandled crash loop.';
    recommendations = [
      'Audit slow-running database queries and implement missing indexes.',
      'Review socket keep-alive parameters and socket connection timeouts.',
      'Optimize database transaction scopes to avoid locking tables.'
    ];
  } else if (msg.includes('500') || msg.includes('internal server error')) {
    rootCause = 'Unhandled application runtime crash or dependency failure.';
    performanceExplanation = 'The backend server returned an HTTP 500 Internal Server Error. This points to a code crash, missing environment keys, or a failed connection to a critical downstream service.';
    recommendations = [
      'Review server crash logs and stack traces on the hosting provider.',
      'Verify secret credentials and environment configuration parameters.',
      'Implement robust global try-catch blocks and error handling middleware.'
    ];
  } else if (msg.includes('404') || msg.includes('not found')) {
    rootCause = 'Incorrect route deployment or deleted API endpoint path.';
    performanceExplanation = 'The server returned HTTP 404 Not Found. This implies that the URL path is invalid, the target file has been removed, or a routing deployment was misconfigured.';
    recommendations = [
      'Verify endpoint route mappings and confirm URL paths.',
      'Review deployment pipeline assets and routing parameters.',
      'Expose safe API version paths (e.g. /api/v1/health).'
    ];
  }

  return {
    rootCause,
    performanceExplanation,
    recommendations
  };
};

exports.analyzeIncident = async (incident, monitor, metrics) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('[AI Root Cause] No GEMINI_API_KEY found. Running deterministic SRE fallback rules compiler.');
    return compileSlaFallbackAnalysis(incident, monitor);
  }

  // Build SRE Diagnostic Prompt
  const latencyLogs = metrics.slice(-10).map(m => `Time: ${new Date(m.timestamp).toISOString()}, Latency: ${m.responseTime}ms, Status: ${m.status}, Up: ${m.isUp}`).join('\n');
  
  const prompt = `You are a senior Site Reliability Engineer (SRE).
Analyze the following API incident outage and its surrounding metric logs.

Incident Outage Details:
- Affected Monitor Name: "${monitor.name}"
- Target URL: "${monitor.url}"
- Failure Message: "${incident.message}"
- Downtime Started: ${new Date(incident.downtimeStart).toISOString()}
- Downtime Ended: ${incident.downtimeEnd ? new Date(incident.downtimeEnd).toISOString() : 'Ongoing'}

Surrounding Metric Logs (last 10 checks):
${latencyLogs}

Please provide:
1. Probable Root Cause (SRE context, short paragraph).
2. Performance Explanation (explaining what the latency or status code pattern implies).
3. SRE Optimization Recommendations (list of 3 actionable items).

You MUST respond strictly with a valid JSON object matching this schema. Do not write markdown tags (like \`\`\`json) outside the JSON, return ONLY the raw JSON string:
{
  "rootCause": "...",
  "performanceExplanation": "...",
  "recommendations": ["...", "...", "..."]
}`;

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    const textResponse = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error('Empty response from Gemini API');
    }

    const jsonResult = JSON.parse(textResponse.trim());
    return {
      rootCause: jsonResult.rootCause || 'Root cause diagnostics inconclusive.',
      performanceExplanation: jsonResult.performanceExplanation || 'Performance metrics are within nominal ranges.',
      recommendations: jsonResult.recommendations || ['Review system logs and server CPU configurations.']
    };

  } catch (err) {
    console.warn('[AI Root Cause] Gemini API request failed. Falling back to SRE rules compiler. Error:', err.message);
    return compileSlaFallbackAnalysis(incident, monitor);
  }
};
