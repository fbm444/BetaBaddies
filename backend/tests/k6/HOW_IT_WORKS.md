# How k6 + Grafana Works (Simple Explanation)

## The Big Picture

Think of it like this:

```
You run a test → Metrics get stored → Grafana shows pretty charts
```

## Step-by-Step

### 1. You Run a k6 Test

When you run:

```bash
k6 run tests/k6/load-test.js
```

**What happens:**

- k6 sends fake requests to your API (like 10 users clicking buttons)
- k6 measures: How fast? How many errors? How many requests per second?
- k6 collects all this data

**Example:**

- "Request took 150ms"
- "Request took 200ms"
- "Request failed"
- "10 requests per second"

### 2. Metrics Get Stored

Instead of just showing numbers on screen, k6 can **save** them to a database:

```bash
k6 run --out influxdb=http://localhost:8086/k6 tests/k6/load-test.js
```

**What happens:**

- k6 sends all the metrics to InfluxDB (a database for storing numbers over time)
- InfluxDB stores: "At 2:00 PM, response time was 150ms"
- InfluxDB stores: "At 2:01 PM, response time was 200ms"
- Like a spreadsheet that keeps growing

**Think of it like:**

- InfluxDB = A notebook that writes down every measurement
- Each measurement has a timestamp
- You can look back at history

### 3. Grafana Shows Pretty Charts

Grafana connects to InfluxDB and makes charts:

**What happens:**

- Grafana asks InfluxDB: "Show me all response times from 2:00 PM to 3:00 PM"
- InfluxDB sends back the data
- Grafana draws a line graph showing how response times changed
- You see a visual chart instead of numbers

**Think of it like:**

- Grafana = A chart maker
- InfluxDB = The data source
- You = The person looking at pretty graphs

## Real-World Example

### Scenario: Testing Your API

**1. You run the test:**

```bash
k6 run tests/k6/load-test.js
```

**What k6 does:**

- Sends 50 fake users to your API
- Each user makes 10 requests
- Measures everything

**2. Metrics collected:**

```
Time: 2:00:00 PM - Response: 150ms, Status: 200 ✅
Time: 2:00:01 PM - Response: 180ms, Status: 200 ✅
Time: 2:00:02 PM - Response: 500ms, Status: 500 ❌
Time: 2:00:03 PM - Response: 200ms, Status: 200 ✅
...
```

**3. InfluxDB stores it:**

```
Database: k6
Table: http_req_duration
- 2:00:00 PM → 150ms
- 2:00:01 PM → 180ms
- 2:00:02 PM → 500ms
- 2:00:03 PM → 200ms
```

**4. Grafana shows you:**

```
📊 Line Chart:
   |
500|                    ● (error spike!)
   |
200|     ●     ●              ●
   |
150|  ●
   |___________________________
   2:00 PM  2:01 PM  2:02 PM
```

## Why This Is Useful

### Without Grafana:

```
You see: "Test completed. 95% of requests < 500ms"
That's it. No history. No trends.
```

### With Grafana:

```
You see:
- Line chart showing response times over time
- Error rate graph
- Request rate graph
- Compare today vs yesterday
- See if performance is getting worse
- Identify problem times
```

## The Components Explained Simply

### k6

**What it is:** A tool that pretends to be many users  
**What it does:** Sends requests and measures performance  
**Output:** Numbers (response time, errors, etc.)

### InfluxDB

**What it is:** A database for storing time-series data  
**What it does:** Saves measurements with timestamps  
**Why:** So you can look at history and trends

### Grafana

**What it is:** A tool for making charts  
**What it does:** Reads data from InfluxDB and makes graphs  
**Why:** Pictures are easier to understand than numbers

## Simple Analogy

**Like a fitness tracker:**

1. **k6** = The fitness tracker on your wrist

   - Measures your heart rate every second
   - Records steps, calories, etc.

2. **InfluxDB** = The app that stores your data

   - Saves all your measurements
   - Keeps history of your workouts

3. **Grafana** = The dashboard showing your progress
   - Shows charts: "Your heart rate over the week"
   - Shows trends: "You're getting fitter!"
   - Visual representation of your data

## What You Actually See

### In Grafana Dashboard:

**Chart 1: Response Time**

```
Line going up and down showing how fast your API responds
- Green = Fast (good)
- Red = Slow (bad)
```

**Chart 2: Error Rate**

```
Bar chart showing how many requests failed
- 0% = Perfect
- 5% = Some problems
- 20% = Big problems!
```

**Chart 3: Requests Per Second**

```
Line showing traffic
- Goes up = More users
- Goes down = Fewer users
```

## How to Use It

### Step 1: Start InfluxDB

```bash
brew services start influxdb
# This starts the database
```

### Step 2: Start Grafana

```bash
brew services start grafana
# This starts the chart maker
```

### Step 3: Run k6 Test

```bash
k6 run --out influxdb=http://localhost:8086/k6 tests/k6/load-test.js
# This runs test AND saves to database
```

### Step 4: Open Grafana

```
1. Go to http://localhost:3000
2. Login (admin/admin)
3. Add InfluxDB as data source
4. Import k6 dashboard (ID: 2587)
5. See your charts!
```

## Common Questions

### Q: Do I need all three?

**A:** Yes, they work together:

- k6 = Collects data
- InfluxDB = Stores data
- Grafana = Shows data

### Q: Can I skip InfluxDB?

**A:** No, Grafana needs somewhere to get data from. InfluxDB is that place.

### Q: Can I use Prometheus instead?

**A:** Yes, but it's more complicated. InfluxDB is easier for k6.

### Q: Do I need to run this all the time?

**A:** No, just when you want to test. But you can set up monitoring to run tests automatically.

## The Flow (One More Time)

```
1. You: "Run load test"
   ↓
2. k6: "Sending 50 fake users to API..."
   ↓
3. k6: "Measuring response times..."
   ↓
4. k6: "Saving to InfluxDB..."
   ↓
5. InfluxDB: "Stored! Timestamp: 2:00 PM, Response: 150ms"
   ↓
6. Grafana: "Reading from InfluxDB..."
   ↓
7. Grafana: "Drawing chart..."
   ↓
8. You: "Oh! I can see my API got slow at 2:05 PM!"
```

## Summary

**k6** = Tests your API and collects numbers  
**InfluxDB** = Saves those numbers with timestamps  
**Grafana** = Makes pretty charts from those numbers

**Result:** You can see how your API performs over time, identify problems, and track improvements!

