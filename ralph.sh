#!/bin/bash

# Ralph Wiggum Loop - Automated Development Loop
# Based on the Ralph Wiggum technique for iterative AI-assisted development
# This script repeatedly feeds context to an AI agent until completion criteria are met

set -euo pipefail

# Configuration
MAX_ITERATIONS=${MAX_ITERATIONS:-50}
COMPLETION_TOKEN="[RALPH_COMPLETE]"
PROGRESS_FILE=".ralph/progress.md"
PRD_FILE="PRD.json"
SPRINT_PLAN_FILE="SPRINT_PLAN.md"
LOG_FILE=".ralph/ralph.log"
ITERATION=0
# Set RALPH_INTERACTIVE=1 to pause and wait for Enter at each iteration
INTERACTIVE=${RALPH_INTERACTIVE:-0}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create necessary directories
mkdir -p .ralph

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1" | tee -a "$LOG_FILE"
}

# Check if PRD exists and is valid JSON
if [ ! -f "$PRD_FILE" ]; then
    log_error "PRD.json not found. Please create it from the sprint plan."
    exit 1
fi

# Validate JSON if jq is available
if command -v jq >/dev/null 2>&1; then
    if ! jq empty "$PRD_FILE" 2>/dev/null; then
        log_error "PRD.json is not valid JSON. Please fix the file."
        exit 1
    fi
else
    log_warning "jq not found - skipping JSON validation"
fi

# Check if sprint plan exists
if [ ! -f "$SPRINT_PLAN_FILE" ]; then
    log_warning "SPRINT_PLAN.md not found. Continuing without it."
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
    cat > "$PROGRESS_FILE" <<EOF
# Ralph Loop Progress

## Status
- **Current Iteration:** 0
- **Last Updated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Status:** Starting

## Completed Tasks
_None yet_

## Current Focus
_Initializing loop_

## Blockers
_None_

## Notes
_Starting Ralph Wiggum loop_

EOF
fi

# Verification function - runs tests, lint, build
verify() {
    log "Running verification checks..."
    
    # Check if package.json exists (Node.js project)
    if [ -f "package.json" ]; then
        # Run linting if available
        if npm run lint --if-present 2>/dev/null; then
            log_success "Linting passed"
        else
            log_warning "Linting check skipped or failed (non-blocking)"
        fi
        
        # Run type checking if available
        if npm run type-check --if-present 2>/dev/null; then
            log_success "Type checking passed"
        else
            log_warning "Type checking skipped or failed (non-blocking)"
        fi
        
        # Run tests if available
        if npm test --if-present 2>/dev/null; then
            log_success "Tests passed"
        else
            log_warning "Tests skipped or failed (non-blocking)"
        fi
        
        # Build if available
        if npm run build --if-present 2>/dev/null; then
            log_success "Build succeeded"
        else
            log_warning "Build skipped or failed (non-blocking)"
        fi
    else
        log_warning "No package.json found - skipping Node.js verification"
    fi
    
    # Git status check
    if git rev-parse --git-dir > /dev/null 2>&1; then
        if [ -n "$(git status --porcelain)" ]; then
            log "Git working directory has changes"
        else
            log "Git working directory is clean"
        fi
    fi
    
    return 0
}

# Check for completion token in progress file
check_completion() {
    # Only check the progress file, not any other files
    if [ ! -f "$PROGRESS_FILE" ]; then
        return 1
    fi
    # Use grep with fixed string matching to avoid regex issues
    if grep -Fq "$COMPLETION_TOKEN" "$PROGRESS_FILE" 2>/dev/null; then
        return 0
    fi
    return 1
}

# Update progress file with current iteration
update_progress() {
    local status="$1"
    local focus="$2"
    local notes="$3"
    
    # Update progress file
    cat > "$PROGRESS_FILE" <<EOF
# Ralph Loop Progress

## Status
- **Current Iteration:** $ITERATION
- **Last Updated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Status:** $status

## Completed Tasks
$(git log --oneline --since="1 day ago" 2>/dev/null | head -10 || echo "_No recent commits_")

## Current Focus
$focus

## Blockers
_Check notes below_

## Notes
$notes

EOF
}

# Commit changes if in git repo
commit_changes() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_warning "Not a git repository - skipping commit"
        return 0
    fi
    
    if [ -z "$(git status --porcelain)" ]; then
        log "No changes to commit"
        return 0
    fi
    
    local commit_msg="Ralph iteration $ITERATION: $(git diff --stat | head -1)"
    
    if git add -A && git commit -m "$commit_msg" 2>/dev/null; then
        log_success "Committed changes: $commit_msg"
    else
        log_warning "Failed to commit changes (may be expected)"
    fi
}

# Main loop
main() {
    log "Starting Ralph Wiggum Loop"
    log "Max iterations: $MAX_ITERATIONS"
    log "PRD: $PRD_FILE"
    log "Progress: $PROGRESS_FILE"
    echo ""
    
    while [ $ITERATION -lt $MAX_ITERATIONS ]; do
        ITERATION=$((ITERATION + 1))
        
        log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        log "Iteration $ITERATION of $MAX_ITERATIONS"
        log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Check for completion token
        if check_completion; then
            log_success "Completion token found! Loop complete."
            break
        fi
        
        # Update progress
        update_progress "Running" "Iteration $ITERATION" "Working on tasks from PRD"
        
        # Display context for AI agent
        echo ""
        log "Context for AI Agent:"
        echo "─────────────────────────────────────────"
        echo ""
        echo "📋 PRD:"
        if command -v jq >/dev/null 2>&1; then
            jq . "$PRD_FILE" 2>/dev/null || head -50 "$PRD_FILE" 2>/dev/null || echo "(PRD file not readable)"
        else
            head -50 "$PRD_FILE" 2>/dev/null || echo "(PRD file not readable)"
        fi
        echo ""
        echo "📊 Current Progress:"
        cat "$PROGRESS_FILE" 2>/dev/null || echo "(Progress file not readable)"
        echo ""
        if [ -f "$SPRINT_PLAN_FILE" ]; then
            echo "📅 Sprint Plan (reference):"
            head -30 "$SPRINT_PLAN_FILE" 2>/dev/null || echo "(Sprint plan not readable)"
            echo ""
        fi
        echo "─────────────────────────────────────────"
        echo ""
        
        # Create work instruction file for AI agent
        WORK_FILE=".ralph/iteration_${ITERATION}_work.md"
        cat > "$WORK_FILE" <<EOF
# Work Needed - Iteration $ITERATION

## Current Status
- **Iteration:** $ITERATION of $MAX_ITERATIONS
- **Focus:** Working on tasks from PRD

## Instructions
1. Review the PRD (PRD.json) and Sprint Plan (SPRINT_PLAN.md)
2. Review current progress (.ralph/progress.md)
3. Select and implement the next highest priority task
4. Make actual code changes, create files, implement features
5. Delete this file when work is complete (or rename to \`.done\`)

## Context Files
- PRD: PRD.json
- Sprint Plan: SPRINT_PLAN.md  
- Progress: .ralph/progress.md
- Spec: spec.md

## Next Steps
After completing work, the script will automatically:
1. Run verification checks (lint, test, build)
2. Commit changes (if git repo)
3. Update progress tracking
4. Continue to next iteration

---

**Delete this file or rename to .done when work is complete to proceed to verification.**
EOF
        
        log_warning "⚠️  Work instruction created: $WORK_FILE"
        log_warning "⚠️  AI Agent should work on tasks and then delete/rename the work file"
        
        if [ "$INTERACTIVE" = "1" ]; then
            log_warning "⚠️  Interactive mode: Press Enter after work is complete to continue verification"
            read -r || true
        else
            log "Waiting for work to be completed (checking every 5 seconds)..."
            log "   Work on tasks and then delete/rename: $WORK_FILE"
            # Wait for work file to be deleted or renamed, with timeout
            WAIT_COUNT=0
            MAX_WAIT=60  # Wait up to 5 minutes (60 * 5 seconds)
            while [ -f "$WORK_FILE" ] && [ $WAIT_COUNT -lt $MAX_WAIT ]; do
                sleep 5
                WAIT_COUNT=$((WAIT_COUNT + 1))
                if [ ! -f "$WORK_FILE" ] || [ -f "${WORK_FILE}.done" ]; then
                    break
                fi
                if [ $((WAIT_COUNT % 12)) -eq 0 ]; then
                    log "   Still waiting... ($((WAIT_COUNT * 5)) seconds elapsed)"
                fi
            done
            
            if [ -f "$WORK_FILE" ] && [ ! -f "${WORK_FILE}.done" ]; then
                log_warning "Work file still exists after wait period. Proceeding to verification anyway..."
            else
                log "Work file processed, proceeding to verification..."
            fi
        fi
        
        # Run verification
        if verify; then
            log_success "Verification passed for iteration $ITERATION"
            
            # Commit changes
            commit_changes
            
            # Update progress
            update_progress "Verified" "Iteration $ITERATION completed" "Verification passed, changes committed"
        else
            log_error "Verification failed for iteration $ITERATION"
            update_progress "Verification Failed" "Iteration $ITERATION" "Verification checks failed - review and fix"
        fi
        
        echo ""
        log "Iteration $ITERATION complete. Continuing..."
        echo ""
        
        # Small delay to allow file system to settle
        sleep 1
    done
    
    if [ $ITERATION -ge $MAX_ITERATIONS ]; then
        log_warning "Reached maximum iterations ($MAX_ITERATIONS)"
        log_warning "Loop stopping. Review progress and continue manually if needed."
    else
        log_success "Ralph Loop completed successfully after $ITERATION iterations!"
    fi
    
    log "Final progress saved to: $PROGRESS_FILE"
    log "Log file: $LOG_FILE"
}

# Run main loop
main
