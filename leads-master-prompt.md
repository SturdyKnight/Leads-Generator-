# MASTER PROMPT: Leads Project - Complete Testing & Debugging Suite
**Status**: ACTIVE DEPLOYMENT MODE | **Priority**: CRITICAL | **Timeline**: Immediate

---

## 🎯 PROJECT SCOPE
**Application**: Google Places API Integrated Leads Management System
**Primary Issue**: Leads Page Output Management & Data Display Inconsistencies
**Current Blockers**: 
- Leads page layout/sorting issues
- Progress tracking glitches
- Tag display problems on city headers
- Contact sorting failures
- Column/row definition inconsistencies

---

## 👥 SUBAGENT ASSIGNMENTS & RESPONSIBILITIES

### **SUBAGENT 1: Frontend Rendering Specialist**
**Role**: UI/UX Display, Layout, & Visual Consistency

#### Inspection Checklist:
- [ ] **City Headers Tag System** - Verify all 4 pills display correctly:
  - [ ] Blue pill (lead count) - shows accurate numbers
  - [ ] Amber pill (avg score) - shows correct average calculation
  - [ ] Emerald pill (phone count) - shows phone availability accurately
  - [ ] Violet pill (top categories) - lists top 3-5 categories
  - [ ] ALL pills have consistent styling, spacing, alignment
  - [ ] Responsive on mobile/tablet/desktop

- [ ] **Column/Row Definition Audit**:
  - [ ] Define universal column widths for consistency
  - [ ] Check row height standardization
  - [ ] Verify header row styles match data rows
  - [ ] Check alternating row colors (if applicable)
  - [ ] Validate padding/margin consistency

- [ ] **Layout Issues**:
  - [ ] No broken layouts on different screen sizes
  - [ ] No overlapping elements
  - [ ] No truncated text without tooltips
  - [ ] Proper text wrapping in all cells
  - [ ] Icons display correctly without distortion

#### Success Criteria:
```
✓ All visual elements render correctly
✓ No console errors related to rendering
✓ Layout stays intact at all viewport sizes
✓ Colors match brand guidelines (Blue, Amber, Emerald, Violet)
✓ Typography hierarchy is clear
```

---

### **SUBAGENT 2: Data Logic & Sorting Specialist**
**Role**: Data Flow, Sorting, Filtering, & Arrangement

#### Inspection Checklist:
- [ ] **Leads Sorting Issues**:
  - [ ] Default sort order defined and consistent
  - [ ] Sort by Name (A-Z, Z-A) - working?
  - [ ] Sort by Lead Count (ascending/descending) - working?
  - [ ] Sort by Score (high-to-low, low-to-high) - working?
  - [ ] Sort by Phone Count - working?
  - [ ] Sort by Date Added/Updated - working?
  - [ ] Sort by Status/Category - working?

- [ ] **Contact/Record Sorting**:
  - [ ] Contacts within each city properly alphabetized
  - [ ] Phone numbers formatted consistently
  - [ ] Duplicate detection working
  - [ ] Stale/outdated records identified

- [ ] **Recent Leads Display** (CRITICAL FIX):
  - [ ] Recent leads appear at TOP of list
  - [ ] "Recently Added" timestamp accurate
  - [ ] Sort by "Date Added" working correctly
  - [ ] No old leads showing before new ones

- [ ] **Data Completeness**:
  - [ ] All fields populated (no empty cells)
  - [ ] NULL/undefined values handled gracefully
  - [ ] No missing data that should be there

#### Success Criteria:
```
✓ Sorting works on all filterable columns
✓ Recent leads always show first
✓ No duplicate records displayed
✓ All data fields visible and populated
✓ Sort state persists on page refresh
```

---

### **SUBAGENT 3: Progress & State Management Specialist**
**Role**: Progress Tracking, Status Updates, & State Persistence

#### Inspection Checklist:
- [ ] **Progress Tracking Issue** (CRITICAL):
  - [ ] Progress bar shows actual completion percentage
  - [ ] "Completed" status doesn't show when actually incomplete
  - [ ] Progress updates in real-time (or on refresh)
  - [ ] No stalled/stuck progress indicators
  - [ ] Status changes persist after page reload

- [ ] **Status Management**:
  - [ ] Lead statuses: New → In Progress → Completed → Archived
  - [ ] Status transitions valid (no invalid state changes)
  - [ ] Status icons/colors match current state
  - [ ] Status filters work correctly

- [ ] **Caching Issues**:
  - [ ] Old cached progress data not displayed
  - [ ] Fresh data fetched on page load
  - [ ] Cache cleared on status update
  - [ ] No stale state persisting

- [ ] **API Response Handling**:
  - [ ] Google Places API responses cached correctly
  - [ ] Rate limiting handled gracefully
  - [ ] Timeout errors caught and displayed
  - [ ] Failed requests retried

#### Success Criteria:
```
✓ Progress accurately reflects completion
✓ No stuck progress states
✓ Status changes reflected immediately
✓ Data refreshes correctly after updates
✓ No misleading "completed" indicators
```

---

### **SUBAGENT 4: API Integration & Data Validation Specialist**
**Role**: Google Places API, Data Accuracy, & External Integrations

#### Inspection Checklist:
- [ ] **Google Places API Integration**:
  - [ ] API key valid and not rate-limited
  - [ ] All required fields fetched (name, phone, address, category)
  - [ ] API response time < 2 seconds
  - [ ] Error handling for API failures
  - [ ] Fallback data displayed when API fails

- [ ] **Data Validation**:
  - [ ] Phone numbers validated (international format support)
  - [ ] Email addresses validated (if applicable)
  - [ ] Addresses parsed correctly
  - [ ] Category classification accurate
  - [ ] Score calculation verified

- [ ] **Data Accuracy Metrics**:
  - [ ] Lead count totals match actual records
  - [ ] Average score calculation mathematically correct
  - [ ] Phone availability percentage accurate
  - [ ] Top categories sorted by frequency

- [ ] **Data Sync**:
  - [ ] Database matches API data
  - [ ] No sync delays > 5 seconds
  - [ ] Duplicate prevention working

#### Success Criteria:
```
✓ All API calls successful
✓ Data validated and accurate
✓ No malformed data in display
✓ API failures handled gracefully
✓ Data sync within acceptable time
```

---

### **SUBAGENT 5: Performance & Optimization Specialist**
**Role**: Speed, Load Times, & Resource Efficiency

#### Inspection Checklist:
- [ ] **Page Load Performance**:
  - [ ] Leads page loads < 3 seconds
  - [ ] Initial data displayed within 2 seconds
  - [ ] No blocking render operations
  - [ ] Images optimized/lazy-loaded

- [ ] **Data Table Performance**:
  - [ ] Virtual scrolling implemented for large datasets?
  - [ ] Pagination working (if used)
  - [ ] No lag when scrolling through leads
  - [ ] No UI freezing during data updates

- [ ] **Memory Leaks**:
  - [ ] No memory growth over time
  - [ ] Proper cleanup on component unmount
  - [ ] Event listeners removed properly
  - [ ] No duplicate API calls

- [ ] **Search/Filter Performance**:
  - [ ] Search results < 500ms
  - [ ] Filter application instant
  - [ ] No layout shift during operations

#### Success Criteria:
```
✓ All pages load within 3 seconds
✓ No performance degradation over time
✓ Smooth interactions and animations
✓ Optimized data loading strategy
```

---

### **SUBAGENT 6: Error Handling & Edge Cases Specialist**
**Role**: Bug Detection, Error Scenarios, & Boundary Testing

#### Inspection Checklist:
- [ ] **Error Scenarios**:
  - [ ] No network connection - graceful fallback?
  - [ ] API rate limit exceeded - user informed?
  - [ ] Malformed API response - handled?
  - [ ] Empty dataset - appropriate messaging?
  - [ ] Single record - layout still correct?
  - [ ] Large dataset (1000+ records) - still performant?

- [ ] **Edge Cases**:
  - [ ] Special characters in names/addresses
  - [ ] Very long business names (truncation/tooltip)
  - [ ] Missing phone numbers (marked clearly)
  - [ ] Multiple category tags fitting properly
  - [ ] Very high/low lead scores

- [ ] **Browser Compatibility**:
  - [ ] Chrome/Edge latest versions
  - [ ] Firefox latest version
  - [ ] Safari latest version
  - [ ] Mobile browsers (iOS Safari, Chrome Mobile)

- [ ] **Input Validation**:
  - [ ] Search input sanitized
  - [ ] No XSS vulnerabilities
  - [ ] No SQL injection risks

#### Success Criteria:
```
✓ All error states handled gracefully
✓ User informed of issues
✓ No console errors or warnings
✓ Works on all major browsers
✓ No security vulnerabilities
```

---

### **SUBAGENT 7: Testing & Documentation Specialist**
**Role**: Test Coverage, QA Protocol, & Deployment Readiness

#### Inspection Checklist:
- [ ] **Functional Testing** (Per Subagent):
  - [ ] Frontend Rendering: 15 test cases passed
  - [ ] Data Logic: 12 test cases passed
  - [ ] Progress Management: 10 test cases passed
  - [ ] API Integration: 10 test cases passed
  - [ ] Performance: 8 test cases passed
  - [ ] Error Handling: 12 test cases passed

- [ ] **Regression Testing**:
  - [ ] Previous features still working?
  - [ ] No new bugs introduced?
  - [ ] Existing bugs not reappeared?

- [ ] **Documentation**:
  - [ ] All bug fixes documented
  - [ ] API integration documented
  - [ ] Known limitations noted
  - [ ] User guide updated
  - [ ] Deployment checklist complete

- [ ] **Deployment Readiness**:
  - [ ] All blockers resolved
  - [ ] No critical issues remaining
  - [ ] Rollback plan documented
  - [ ] Monitoring alerts configured

#### Success Criteria:
```
✓ 100% of critical issues resolved
✓ 95%+ of identified bugs fixed
✓ All documentation current
✓ Ready for production deployment
```

---

## 🔴 CRITICAL ISSUES PRIORITY MATRIX

### **P0 - MUST FIX (Blocks Deployment)**
1. **Recent leads not showing at top** → Assign to SUBAGENT 2
2. **Progress stuck despite "Completed" status** → Assign to SUBAGENT 3
3. **Leads page layout broken** → Assign to SUBAGENT 1
4. **Contact sorting not working** → Assign to SUBAGENT 2

### **P1 - HIGH (Fix Before Release)**
5. **Column/row definition inconsistent** → Assign to SUBAGENT 1
6. **Colorful tag display issues** → Assign to SUBAGENT 1
7. **Data accuracy verification** → Assign to SUBAGENT 4

### **P2 - MEDIUM (Fix This Week)**
8. **Performance optimization** → Assign to SUBAGENT 5
9. **Edge case handling** → Assign to SUBAGENT 6
10. **Browser compatibility** → Assign to SUBAGENT 6

---

## 📋 DEBUGGING WORKFLOW FOR EACH SUBAGENT

### **STEP 1: ISOLATION**
```
1. Identify the specific component/function causing issue
2. Reproduce the bug consistently
3. Document reproduction steps
4. Note expected vs actual behavior
```

### **STEP 2: ROOT CAUSE ANALYSIS**
```
1. Check browser console for errors
2. Inspect network tab for API issues
3. Review state management logic
4. Check data flow at each step
5. Verify backend/frontend synchronization
```

### **STEP 3: IMPLEMENTATION OF FIX**
```
1. Write minimal fix (avoid scope creep)
2. Add inline comments explaining fix
3. Test fix in isolation
4. Test fix doesn't break other features
```

### **STEP 4: VALIDATION**
```
1. Verify bug no longer reproducible
2. Test on multiple browsers
3. Test on multiple devices
4. Document the fix
5. Sign off: [SUBAGENT NAME] ✓
```

---

## 🧪 TESTING COMMAND CHECKLIST

**Before Each Test Session, Run:**
```bash
# Clear cache and localStorage
DevTools → Application → Clear Site Data

# Check console for errors
DevTools → Console (should be empty)

# Verify no network errors
DevTools → Network Tab → All requests 200-304

# Reset to fresh state
Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)
```

---

## 📊 DEPLOYMENT CHECKLIST

- [ ] All P0 issues resolved
- [ ] All P1 issues resolved  
- [ ] All test cases passing
- [ ] No console errors
- [ ] No network errors
- [ ] Load time acceptable
- [ ] Mobile responsive verified
- [ ] Browser compatibility verified
- [ ] Documentation updated
- [ ] Monitoring configured
- [ ] Rollback plan in place

**Final Sign-Off**: _________________________ (Date: __________)

---

## 🎯 SUCCESS METRICS

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Page Load Time | < 3s | ? | [ ] |
| Leads Display Accuracy | 100% | ? | [ ] |
| Sorting Functionality | 100% | ? | [ ] |
| Recent Leads First | ✓ | ✗ | [ ] |
| Progress Accuracy | 100% | ? | [ ] |
| Console Errors | 0 | ? | [ ] |
| API Response Time | < 2s | ? | [ ] |
| Mobile Responsive | ✓ | ? | [ ] |
| Cross-Browser Compatible | ✓ | ? | [ ] |

---

## 📞 ESCALATION PROTOCOL

If a subagent encounters:
- **Unknown issue**: Escalate to Frontend Lead + Backend Lead
- **API limitation**: Escalate to DevOps + Google Partner Manager
- **Architecture problem**: Escalate to Tech Lead (Full System Redesign)
- **Timeline risk**: Escalate to Project Manager + Stakeholders

---

## 🚀 EXECUTION TIMELINE

**Day 1**: P0 Issues (4 items) - SUBAGENTS 1,2,3
**Day 2**: P1 Issues (3 items) - SUBAGENTS 1,4
**Day 3**: P2 Issues + Testing - SUBAGENTS 5,6,7
**Day 4**: Final QA + Documentation - SUBAGENT 7
**Day 5**: Deployment + Monitoring - All Teams

---

**Generated**: [Current Date]
**Last Updated**: [Current Date]
**Deployment Status**: 🔴 NOT READY → 🟡 IN PROGRESS → 🟢 READY

---

## NOTES FOR EXECUTION:

1. **Each subagent works independently** but shares findings in central log
2. **Daily standup**: 15 min sync to share blockers and updates
3. **Cross-check**: Frontend changes → validate with Data Logic specialist
4. **Documentation**: All findings logged with timestamps
5. **No merged PRs** until all tests for that area pass
6. **Staging environment** used for all testing before production
7. **User acceptance test** after all fixes (if applicable)
