# SUBAGENT DEBUGGING TOOLKIT
**Quick Reference for Immediate Issue Investigation**

---

## 🔧 SUBAGENT 1: Frontend Rendering Specialist

### IMMEDIATE INSPECTION COMMANDS

**Check Tag Display:**
```javascript
// Run in browser console
const tags = document.querySelectorAll('[data-pill="tag"]');
console.log(`Found ${tags.length} tags`);
tags.forEach(tag => {
  console.log({
    text: tag.textContent,
    color: window.getComputedStyle(tag).backgroundColor,
    padding: window.getComputedStyle(tag).padding,
    margin: window.getComputedStyle(tag).margin
  });
});
```

**Check Layout Consistency:**
```javascript
// Verify all rows have same height
const rows = document.querySelectorAll('tbody tr');
const heights = Array.from(rows).map(r => r.offsetHeight);
console.log('Row heights:', heights);
console.log('All consistent?', new Set(heights).size === 1);
```

**Verify Column Widths:**
```javascript
// Check column definitions
const headers = document.querySelectorAll('thead th');
headers.forEach((h, i) => {
  console.log(`Column ${i}: ${h.textContent} = ${h.offsetWidth}px`);
});
```

**Inspect City Headers:**
```javascript
// Check city header structure
document.querySelectorAll('[data-city-header]').forEach(header => {
  const pills = header.querySelectorAll('[data-pill]');
  console.log(header.textContent, '→ Pills found:', pills.length);
  pills.forEach(p => console.log(`  • ${p.getAttribute('data-pill')}: ${p.textContent}`));
});
```

### CHECKLIST FOR THIS AGENT:
- [ ] All 4 pill types rendering (Blue, Amber, Emerald, Violet)
- [ ] Pill colors match specifications
- [ ] Column widths uniform across all rows
- [ ] No text truncation without tooltips
- [ ] Responsive on 3 viewport sizes (mobile, tablet, desktop)

---

## 🔧 SUBAGENT 2: Data Logic & Sorting Specialist

### IMMEDIATE INSPECTION COMMANDS

**Verify Sort Order:**
```javascript
// Check if "recent leads" are actually recent
const leads = document.querySelectorAll('[data-lead-item]');
const dates = Array.from(leads).map(l => ({
  name: l.querySelector('[data-lead-name]')?.textContent,
  date: l.getAttribute('data-added-date'),
  timestamp: new Date(l.getAttribute('data-added-date')).getTime()
}));
console.table(dates);
console.log('Is sorted by date (newest first)?', 
  dates.every((d, i) => i === 0 || dates[i-1].timestamp >= d.timestamp)
);
```

**Check Sort Column Headers:**
```javascript
// Verify all headers are clickable for sort
const headers = document.querySelectorAll('th[data-sortable]');
console.log(`Sortable columns: ${headers.length}`);
headers.forEach(h => {
  console.log(`✓ ${h.textContent} - cursor: ${window.getComputedStyle(h).cursor}`);
});
```

**Validate Data Completeness:**
```javascript
// Find empty/null fields
const leads = document.querySelectorAll('[data-lead-item]');
const issues = [];
leads.forEach((lead, i) => {
  const fields = ['name', 'phone', 'score', 'category'];
  fields.forEach(field => {
    const value = lead.querySelector(`[data-${field}]`)?.textContent?.trim();
    if (!value || value === 'N/A' || value === '') {
      issues.push({row: i, field, value: value || 'EMPTY'});
    }
  });
});
console.table(issues);
```

**Check Duplicate Detection:**
```javascript
// Find duplicate entries
const names = new Map();
document.querySelectorAll('[data-lead-item]').forEach(lead => {
  const name = lead.querySelector('[data-lead-name]')?.textContent?.trim();
  if (name) {
    names.set(name, (names.get(name) || 0) + 1);
  }
});
const dupes = Array.from(names).filter(([_, count]) => count > 1);
console.table(dupes.length ? dupes : 'No duplicates found');
```

**Test Sort Functionality:**
```javascript
// Simulate clicks on each sortable column
const headers = document.querySelectorAll('th[data-sortable]');
console.log(`Testing ${headers.length} sortable columns...`);
headers.forEach(h => {
  const col = h.textContent;
  h.click();
  setTimeout(() => console.log(`Clicked: ${col}`), 100);
});
```

### CHECKLIST FOR THIS AGENT:
- [ ] Recent leads appear first (verify timestamp order)
- [ ] All sort buttons functional (test each column)
- [ ] No missing/empty data fields
- [ ] Duplicate records identified and flagged
- [ ] Contact alphabetization working
- [ ] Sort state persists on refresh

---

## 🔧 SUBAGENT 3: Progress & State Management Specialist

### IMMEDIATE INSPECTION COMMANDS

**Check Progress State:**
```javascript
// Inspect progress data
const progressBars = document.querySelectorAll('[data-progress]');
progressBars.forEach(bar => {
  const status = bar.getAttribute('data-status');
  const percentage = bar.getAttribute('data-progress');
  const display = bar.textContent;
  console.log({
    status,
    percentage: `${percentage}%`,
    display,
    mismatch: (percentage === '100' && status !== 'completed')
  });
});
```

**Check State Persistence:**
```javascript
// Verify state after refresh
console.log('Current state:', JSON.stringify(window.appState || {}, null, 2));
// After page refresh, check if state matches
```

**Verify Cache Status:**
```javascript
// Check localStorage/sessionStorage for stale data
console.log('localStorage:', localStorage);
console.log('sessionStorage:', sessionStorage);
// Look for old timestamps
Object.entries(localStorage).forEach(([key, val]) => {
  console.log(`${key}: ${val.substring(0, 50)}...`);
});
```

**Check Status Transitions:**
```javascript
// Verify valid state transitions
const validTransitions = {
  'new': ['in-progress', 'archived'],
  'in-progress': ['completed', 'archived'],
  'completed': ['archived'],
  'archived': []
};
// Log any invalid transitions attempted
```

**Monitor API Updates:**
```javascript
// Track when progress updates trigger API calls
const originalFetch = window.fetch;
window.fetch = function(...args) {
  if (args[0].includes('progress') || args[0].includes('status')) {
    console.log(`API Call: ${args[0]}`, new Date());
  }
  return originalFetch.apply(this, args);
};
```

### CHECKLIST FOR THIS AGENT:
- [ ] Progress % matches completion status
- [ ] No stuck progress indicators
- [ ] "Completed" status only when actually complete
- [ ] Status changes persist after refresh
- [ ] Cache doesn't hold stale data
- [ ] Progress updates in real-time

---

## 🔧 SUBAGENT 4: API Integration & Data Validation Specialist

### IMMEDIATE INSPECTION COMMANDS

**Verify API Responses:**
```javascript
// Check API call results in network tab
// DevTools → Network → Filter: fetch/XHR
// Look for:
// - Status codes: 200, 304 (good), 429 (rate limited), 500 (server error)
// - Response times: should be < 2000ms
// - Response size: check if data looks complete
```

**Validate Phone Numbers:**
```javascript
// Check phone format consistency
const phones = document.querySelectorAll('[data-phone]');
const formats = new Map();
phones.forEach(p => {
  const phone = p.textContent.trim();
  const format = phone.match(/[\d\-\(\)\+]/g)?.join('') || 'INVALID';
  formats.set(phone, format.length);
});
console.table(formats);
```

**Verify Calculation Accuracy:**
```javascript
// Check average score calculation
const scores = Array.from(
  document.querySelectorAll('[data-score]')
).map(el => parseFloat(el.textContent));
const calculated = scores.reduce((a, b) => a + b, 0) / scores.length;
const displayed = document.querySelector('[data-avg-score]')?.textContent;
console.log({
  calculated: calculated.toFixed(2),
  displayed,
  match: Math.abs(calculated - parseFloat(displayed)) < 0.01
});
```

**Count Validation:**
```javascript
// Verify lead count matches actual records
const actualCount = document.querySelectorAll('[data-lead-item]').length;
const displayedCount = parseInt(
  document.querySelector('[data-lead-count]')?.textContent || '0'
);
console.log({
  actual: actualCount,
  displayed: displayedCount,
  match: actualCount === displayedCount
});
```

**Check API Rate Limiting:**
```javascript
// Monitor API calls for rate limit headers
// Look for: X-RateLimit-Remaining, X-RateLimit-Reset
// In Network tab, check Response Headers
```

### CHECKLIST FOR THIS AGENT:
- [ ] All API calls return 200 status
- [ ] Response times < 2 seconds
- [ ] Rate limiting not exceeded
- [ ] Phone numbers validated
- [ ] Score calculation accurate
- [ ] Count totals match records
- [ ] No malformed API responses

---

## 🔧 SUBAGENT 5: Performance & Optimization Specialist

### IMMEDIATE INSPECTION COMMANDS

**Measure Page Load:**
```javascript
// Get Core Web Vitals
if (window.performance) {
  const perf = performance.timing;
  const pageLoadTime = perf.loadEventEnd - perf.navigationStart;
  const firstPaint = perf.responseStart - perf.navigationStart;
  console.log({
    pageLoadTime: `${pageLoadTime}ms`,
    firstPaint: `${firstPaint}ms`,
    acceptable: pageLoadTime < 3000
  });
}
```

**Check for Memory Leaks:**
```javascript
// Monitor memory usage (Chrome only)
if (performance.memory) {
  console.log({
    usedJSHeapSize: `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)}MB`,
    jsHeapSizeLimit: `${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)}MB`,
    usagePercent: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(1)
  });
}
// Run every 10 seconds to watch for growth
```

**Profile Data Loading:**
```javascript
// Check how long data rendering takes
console.time('renderLeads');
// Trigger render...
console.timeEnd('renderLeads');
```

**Monitor Network:**
```javascript
// Check request waterfall
// DevTools → Network → Disable cache → Reload
// Look for:
// - Parallel requests? (should be)
// - Large resources? (should compress)
// - Slow endpoints? (should optimize)
```

### CHECKLIST FOR THIS AGENT:
- [ ] Page loads in < 3 seconds
- [ ] No memory growth over time
- [ ] Smooth scrolling through large lists
- [ ] Search/filter response < 500ms
- [ ] No layout shifts during updates
- [ ] Images optimized/lazy-loaded

---

## 🔧 SUBAGENT 6: Error Handling & Edge Cases Specialist

### IMMEDIATE INSPECTION COMMANDS

**Test Network Failure:**
```javascript
// DevTools → Network → Throttle (Offline)
// Try to load leads → should show error message
// Throttle to "Slow 3G" → should show loading indicator
// Check: Does UI handle gracefully?
```

**Test Empty States:**
```javascript
// Manually clear leads data
localStorage.removeItem('leads');
// Or filter to find no results
// Should show: "No leads found" message (not blank page)
```

**Test Large Dataset:**
```javascript
// Check performance with 1000+ records
// Load app with large dataset → should still be responsive
// Monitor console for errors
```

**Check for XSS Vulnerabilities:**
```javascript
// Try injecting script tags
const test = '<script>alert("xss")</script>';
// If this appears as code instead of running, you're protected
// Look for HTML escaping in search/input fields
```

**Test Special Characters:**
```javascript
// Try names with: éàü, 中文, emoji, quotes, brackets
// Example search: "O'Reilly's & Co. <Ltd>"
// Should handle without breaking layout
```

### CHECKLIST FOR THIS AGENT:
- [ ] No network = graceful error message
- [ ] Empty results = "No leads found" message
- [ ] Large dataset = still performant
- [ ] Special characters = no layout breaks
- [ ] XSS attempts = properly escaped
- [ ] Works on Chrome, Firefox, Safari, Edge
- [ ] Works on mobile browsers

---

## 🔧 SUBAGENT 7: Testing & Documentation Specialist

### TEST CASE TEMPLATE

```markdown
## Test Case: [Feature Name]
**Severity**: P0/P1/P2
**Status**: Not Started / In Progress / Passed / Failed

### Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Result:
[What should happen]

### Actual Result:
[What actually happened]

### Screenshot/Video:
[Attach if applicable]

### Root Cause:
[If failed, what caused it]

### Fix Applied:
[If fixed, describe the fix]

### Signed Off By:
[Subagent Name] - [Date] - [Time]
```

### REGRESSION TEST CHECKLIST:

```bash
# Before deployment, verify:

# 1. LEADS DISPLAY
- [ ] All leads visible
- [ ] No broken images
- [ ] All text readable
- [ ] No layout shifts

# 2. SORTING & FILTERING
- [ ] Sort by name works
- [ ] Sort by score works
- [ ] Sort by date works
- [ ] Filter by category works
- [ ] Multiple filters combined work

# 3. DATA INTEGRITY
- [ ] No missing information
- [ ] Phone numbers valid
- [ ] Addresses correct
- [ ] Scores accurate
- [ ] Categories proper

# 4. RESPONSIVENESS
- [ ] Mobile (320px) - works
- [ ] Tablet (768px) - works
- [ ] Desktop (1920px) - works
- [ ] Touch interactions work on mobile

# 5. ERROR HANDLING
- [ ] Network error message shows
- [ ] No results message shows
- [ ] Loading indicator appears
- [ ] Retry button works

# 6. PERFORMANCE
- [ ] Load time < 3s
- [ ] No console errors
- [ ] No memory leaks
- [ ] Smooth scrolling
```

---

## 📋 CROSS-AGENT COMMUNICATION LOG

**Template for daily standup:**
```
[SUBAGENT NAME] - [DATE] [TIME]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: [🟢 On Track / 🟡 Blocked / 🔴 Critical]

Completed:
- [ ] Item 1
- [ ] Item 2

In Progress:
- [ ] Item 3

Blockers:
- [ ] Item 4 - needs [dependency]

Findings:
- Root cause of issue X is in [component]
- Requires coordination with SUBAGENT Y

Next Steps:
- [ ] Fix for issue X ready for testing
- [ ] Awaiting feedback on issue Y

```

---

## 🚨 COMMON ISSUES & QUICK FIXES

### Issue: Recent Leads Not Showing First
**Root Cause**: Sort order not set or data not sorted by timestamp
**Quick Fix**:
```javascript
// In your leads data fetch:
leads.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
```

### Issue: Progress Stuck at 95%
**Root Cause**: API call pending or cache not cleared
**Quick Fix**:
```javascript
// Clear any cached progress state
sessionStorage.removeItem('progressState');
localStorage.removeItem('progressState');
// Refetch from API
```

### Issue: Colorful Tags Not Displaying
**Root Cause**: CSS classes not applied or colors not defined
**Quick Fix**:
```css
/* Ensure color classes exist */
.pill-blue { background-color: #3B82F6; }
.pill-amber { background-color: #F59E0B; }
.pill-emerald { background-color: #10B981; }
.pill-violet { background-color: #8B5CF6; }
```

### Issue: Column Widths Inconsistent
**Root Cause**: No fixed width defined or flexbox growing unevenly
**Quick Fix**:
```css
th, td {
  width: 150px; /* or use: width: 20%; */
  min-width: 150px;
  max-width: 150px;
}
```

---

**Remember**: Each subagent updates this document with findings. No issue is too small to document!
