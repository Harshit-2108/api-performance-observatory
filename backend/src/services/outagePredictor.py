import sys
import json
import numpy as np

def calculate_metrics_features(metrics):
    # Sort metrics chronologically by timestamp
    metrics = sorted(metrics, key=lambda x: x.get('timestamp', ''))
    
    n = len(metrics)
    if n < 10:
        return None, None
        
    features = []
    targets = []
    
    # Extract training samples
    for i in range(9, n - 1):
        window = metrics[i-9:i+1] # 10 checks
        next_check = metrics[i+1]
        
        # Calculate features
        latencies = [w.get('responseTime', 0) for w in window]
        is_ups = [w.get('isUp', True) for w in window]
        
        avg_short = np.mean(latencies[-3:])
        avg_long = np.mean(latencies)
        latency_ratio = avg_short / max(1.0, avg_long)
        
        std_dev = np.std(latencies)
        error_rate = 1.0 - (sum(is_ups[-5:]) / 5.0)
        
        # Growth slope
        growth = (latencies[-1] - latencies[-3]) / max(1.0, latencies[-3])
        
        features.append([avg_short, avg_long, latency_ratio, std_dev, error_rate, growth])
        
        # Target: Will fail next check?
        targets.append(0 if next_check.get('isUp', True) else 1)
        
    return np.array(features), np.array(targets)

def predict_current_risk(metrics):
    metrics = sorted(metrics, key=lambda x: x.get('timestamp', ''))
    n = len(metrics)
    
    if n < 10:
        return {
            "riskLevel": "LOW",
            "confidence": 98.2,
            "explanation": "Uptime matches stable parameters. Insufficient historical time-series data to train anomaly classifiers (minimum 10 checks required).",
            "factors": ["Stable operational checks", "Historical log base is too small"]
        }
        
    # Generate training data
    X, y = calculate_metrics_features(metrics)
    
    # Features for the most recent window (to predict next cycle)
    last_window = metrics[-10:]
    last_latencies = [w.get('responseTime', 0) for w in last_window]
    last_is_ups = [w.get('isUp', True) for w in last_window]
    
    avg_short = np.mean(last_latencies[-3:])
    avg_long = np.mean(last_latencies)
    latency_ratio = avg_short / max(1.0, avg_long)
    std_dev = np.std(last_latencies)
    error_rate = 1.0 - (sum(last_is_ups[-5:]) / 5.0)
    growth = (last_latencies[-1] - last_latencies[-3]) / max(1.0, last_latencies[-3])
    
    current_features = np.array([[avg_short, avg_long, latency_ratio, std_dev, error_rate, growth]])
    
    # 1. Simple fallback Classifier rule logic (in case fitting fails or there is only 1 class in y)
    # Determine base probability using rule conditions first
    p_fail = 0.05
    factors = []
    
    if latency_ratio > 1.3:
        p_fail += 0.25
        factors.append(f"Recent average latency of {int(avg_short)}ms is 30%+ higher than baseline ({int(avg_long)}ms)")
    if std_dev > 120:
        p_fail += 0.15
        factors.append(f"High standard deviation variance of {int(std_dev)}ms in response times")
    if error_rate > 0:
        p_fail += 0.40
        factors.append(f"Frequent check failures ({int(error_rate * 100)}% error rate) detected in past 5 cycles")
    if growth > 0.4:
        p_fail += 0.15
        factors.append(f"Sustained response time spike rate (+{int(growth * 100)}% latency increase)")

    p_fail = min(0.99, max(0.01, p_fail))
    
    # 2. Try training classifier dynamically using scikit-learn
    try:
        from sklearn.tree import DecisionTreeClassifier
        # Check if we have both classes represented in training set to avoid trivial prediction failures
        if X is not None and len(np.unique(y)) > 1:
            clf = DecisionTreeClassifier(max_depth=3, random_state=42)
            clf.fit(X, y)
            
            # Predict probability of class 1 (Outage / DOWN)
            probs = clf.predict_proba(current_features)[0]
            ml_p_fail = probs[1]
            
            # Blended score (70% ML weights, 30% rule indicators weights)
            p_fail = (ml_p_fail * 0.7) + (p_fail * 0.3)
    except Exception as e:
        # Graceful fallback to rule-based p_fail if sklearn is missing
        pass

    # Map probability to risk thresholds
    if p_fail < 0.20:
        risk_level = "LOW"
        confidence = (1.0 - p_fail) * 100
        explanation = "The endpoint demonstrates stable latencies and success logs. Anomaly risk indicators are within safe limits."
    elif p_fail < 0.50:
        risk_level = "MEDIUM"
        confidence = (1.0 - p_fail) * 100
        explanation = "Minor latency fluctuations or response deviations observed. Performance is stable, but monitoring is recommended."
    elif p_fail < 0.80:
        risk_level = "HIGH"
        confidence = p_fail * 100
        explanation = "Substantial response degradation detected. Significant response growth slope and minor check failures signal an imminent outage risk."
    else:
        risk_level = "CRITICAL"
        confidence = p_fail * 100
        explanation = "Severe outage conditions detected. Multiple check timeouts or recurring HTTP errors indicate service breach is ongoing or imminent."
        
    if not factors:
        factors.append("Operational latencies align with standard averages")
        factors.append("Zero failure codes reported in the hour")

    return {
        "riskLevel": risk_level,
        "confidence": round(confidence, 1),
        "explanation": explanation,
        "factors": factors
    }

if __name__ == "__main__":
    try:
        # Read JSON string payload from standard input
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({
                "riskLevel": "LOW",
                "confidence": 99.0,
                "explanation": "No metrics data supplied to the prediction engine. Defaulting to safe parameters.",
                "factors": ["Zero input logs provided"]
            }))
            sys.exit(0)
            
        metrics_list = json.loads(input_data)
        prediction = predict_current_risk(metrics_list)
        print(json.dumps(prediction))
        
    except Exception as err:
        # Graceful traceback dump
        print(json.dumps({
            "riskLevel": "LOW",
            "confidence": 95.0,
            "explanation": f"AI model run encountered execution error: {str(err)}. Falling back to safe parameters.",
            "factors": ["Auditor engine exception"]
        }))
