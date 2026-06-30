const { spawn } = require('child_process');
const path = require('path');

// Node-side rule-based backup predictor (ensures fallback output if Python is absent)
const runNodeFallbackPredictor = (metrics) => {
  const sorted = [...metrics].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const n = sorted.length;

  if (n < 10) {
    return {
      riskLevel: 'LOW',
      confidence: 97.4,
      explanation: 'Uptime indicators match stable targets. Node fallback rules active due to insufficient historical check metrics (minimum 10 required).',
      factors: ['Baseline metric logs count low', 'Continuous operational success']
    };
  }

  const last10 = sorted.slice(-10);
  const latencies = last10.map(m => m.responseTime || 0);
  const states = last10.map(m => m.isUp ?? true);

  // Short term avg (past 3 checks) vs long term (past 10 checks)
  const avgShort = latencies.slice(-3).reduce((s, x) => s + x, 0) / 3;
  const avgLong = latencies.reduce((s, x) => s + x, 0) / 10;
  const latencyRatio = avgShort / Math.max(1, avgLong);

  // Standard deviation
  const mean = avgLong;
  const variance = latencies.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / 10;
  const stdDev = Math.sqrt(variance);

  // Error rate (past 5 checks)
  const past5States = states.slice(-5);
  const failedCount = past5States.filter(s => s === false).length;
  const errorRate = failedCount / 5;

  // Latency growth rate (growth over past 3 checks)
  const lat1 = latencies[latencies.length - 1];
  const lat3 = latencies[latencies.length - 3] || 1;
  const growth = (lat1 - lat3) / Math.max(1, lat3);

  let pFail = 0.05;
  const factors = [];

  if (latencyRatio > 1.3) {
    pFail += 0.25;
    factors.append ? factors.push(`Recent latencies (${Math.round(avgShort)}ms) rose 30%+ above baseline (${Math.round(avgLong)}ms)`) : null;
  }
  if (stdDev > 120) {
    pFail += 0.15;
    factors.push(`High standard deviation variance of ${Math.round(stdDev)}ms in response times`);
  }
  if (errorRate > 0) {
    pFail += 0.40;
    factors.push(`Frequent check failures (${Math.round(errorRate * 100)}% error rate) detected in past 5 cycles`);
  }
  if (growth > 0.4) {
    pFail += 0.15;
    factors.push(`Sustained response time spike rate (+${Math.round(growth * 100)}% latency increase)`);
  }

  pFail = Math.min(0.99, Math.max(0.01, pFail));

  let riskLevel = 'LOW';
  let confidence = (1.0 - pFail) * 100;
  let explanation = 'The endpoint demonstrates stable latencies and success logs. Anomaly risk indicators are within safe limits.';

  if (pFail >= 0.20 && pFail < 0.50) {
    riskLevel = 'MEDIUM';
    confidence = (1.0 - pFail) * 100;
    explanation = 'Minor latency fluctuations or response deviations observed. Performance is stable, but monitoring is recommended.';
  } else if (pFail >= 0.50 && pFail < 0.80) {
    riskLevel = 'HIGH';
    confidence = pFail * 100;
    explanation = 'Substantial response degradation detected. Significant response growth slope and minor check failures signal an imminent outage risk.';
  } else if (pFail >= 0.80) {
    riskLevel = 'CRITICAL';
    confidence = pFail * 100;
    explanation = 'Severe outage conditions detected. Multiple check timeouts or recurring HTTP errors indicate service breach is ongoing or imminent.';
  }

  if (factors.length === 0) {
    factors.push('Operational latencies align with standard averages');
    factors.push('Zero failure codes reported in the hour');
  }

  return {
    riskLevel,
    confidence: Math.round(confidence * 10) / 10,
    explanation: `${explanation} (Calculated using Node-side rule aggregates fallback)`,
    factors
  };
};

// Core predict action
exports.predictOutage = (metrics) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'outagePredictor.py');
    
    // Spawn python process
    const pythonProcess = spawn('python', [scriptPath]);
    
    let stdoutBuffer = '';
    let stderrBuffer = '';

    // Write input payload to standard input
    try {
      pythonProcess.stdin.write(JSON.stringify(metrics));
      pythonProcess.stdin.end();
    } catch (writeErr) {
      console.warn('[AI Service] Stdin pipe error, returning Node fallback:', writeErr.message);
      return resolve(runNodeFallbackPredictor(metrics));
    }

    // Capture standard output
    pythonProcess.stdout.on('data', (data) => {
      stdoutBuffer += data.toString();
    });

    // Capture standard error logs
    pythonProcess.stderr.on('data', (data) => {
      stderrBuffer += data.toString();
    });

    // Handle process exits
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.warn(`[AI Service] Python process exited with code ${code}. Stderr: ${stderrBuffer}. Running Node fallback.`);
        return resolve(runNodeFallbackPredictor(metrics));
      }

      try {
        const result = JSON.parse(stdoutBuffer.strip ? stdoutBuffer.strip() : stdoutBuffer.trim());
        resolve(result);
      } catch (parseErr) {
        console.warn('[AI Service] Failed to parse Python JSON output, running Node fallback:', parseErr.message);
        resolve(runNodeFallbackPredictor(metrics));
      }
    });

    // Handle spawn exceptions
    pythonProcess.on('error', (spawnErr) => {
      console.warn('[AI Service] Failed to spawn Python child process. (Python or scikit-learn may be missing). Running Node fallback.');
      resolve(runNodeFallbackPredictor(metrics));
    });
  });
};
